(function(window, $) {

    var isDefined = function(item) {
        return (item !== undefined) && (item != null);
    };

    // defining compatibility of upload control object
    var xhrUploadFlag = false;
    if (window.XMLHttpRequest) {
        var testXHR = new XMLHttpRequest();
        xhrUploadFlag = isDefined(testXHR.upload);
    }

    // utility object for checking browser compatibility
    $.extend($.support, {
        fileSelecting: isDefined(window.File) && isDefined(window.FileList),
        fileReading: isDefined(window.FileReader),
        fileSending: isDefined(window.FormData),
        uploadControl: xhrUploadFlag
    });

    // generates uniq id
    var uniq = function(length, prefix) {
        length = parseInt(length);
        prefix = prefix || '';
        if ((length == 0) || isNaN(length)) {
            return prefix;
        }
        var ch = String.fromCharCode(Math.floor(Math.random() * 26) + 97);
        return prefix + ch + uniq(--length);
    };

    // checking that item is File instance or Blob [that have File compatible API]
    var checkIsFile = function(item) {
        return (item instanceof File) || (item instanceof Blob);
    };

    ////////////////////////////////////////////////////////////////////////////
    // plugin code
    $.fn.damnUploader = function(params) {

        if (this.length == 0) {
            return this;
        } else if (this.length > 1) {
            return this.each(function() {
                $(this).damnUploader(params);
            });
        }

        // context
        var $this = this;

        // locals
        var queue = $this._damnUploaderQueue;
        var set = $this._damnUploaderSettings || {};

        ////////////////////////////////////////////////////////////////////////
        // initialization

        /* default settings */
        $this._damnUploaderSettings = $.extend({
            url: '/upload.php',
            multiple: true,
            fieldName: 'file',
            dropping: true,
            dropBox: false,
            limit: false,
            dataType: 'text'
        }, params || {});

        // upload item object
        var UploadItem = function(file, completeCallback, progressCallback) {
            this._id = uniq(5);
            this.file = file;
            this.replaceName = null;
            this.progressCallback = progressCallback;
            this.completeCallback = completeCallback;
            this._post = [];
        };
        $.extend(UploadItem.prototype, {
            id : function() {
                return this._id;
            },
            addPostData: function(fieldNameOrFieldsArray, value) {
                var self = this;
                if ($.isArray(fieldNameOrFieldsArray)) {
                    $.each(fieldNameOrFieldsArray, function(i, item) {
                        self.addPostData(item.name, item.value);
                    });
                    return ;
                }
                this._post.push({"name" : fieldNameOrFieldsArray, "value" : value});
            },
            cancel: function() {
                $this.uploaderCancel(this._id);
            },
            getReaderCallback: function(callback) {
                var reader;
                if ($.support.fileReading) {
                    reader = new FileReader();
                    reader.onload = callback;
                }
                return reader;
            },
            readAs: function(as, callback) {
                var methodName = 'readAs' + as;
                var reader = this.getReaderCallback(callback);
                reader && reader[methodName] && reader[methodName].call(reader, this.file);
            }
        });


        // private properties
        $this._damnUploaderQueue = {};
        $this._damnUploaderItemsCount = 0;
        queue = $this._damnUploaderQueue;
        set = $this._damnUploaderSettings;

        // private items-adding method
        $this._damnUploaderFilesAddMap = function(files) {
            var addingEvent = $.Event("uploader.add");
            var limitEvent = $.Event("uploader.limit");
            var triggerAndAdd = function(file) {
                addingEvent.uploadItem = $this.uploaderNewUploadItem(file);
                $this.trigger(addingEvent);
                if (!addingEvent.isDefaultPrevented()) {
                    $this.uploaderAdd(addingEvent.uploadItem);
                }
            };
            if (!$.support.fileSelecting) {
                if ($this._damnUploaderItemsCount === set.limit) {
                    $this.trigger(limitEvent);
                    return false;
                }
                triggerAndAdd({
                    fake: true,
                    name: files.value,
                    inputElement: files
                });
                return true;
            }
            if (files instanceof FileList) {
                $.each(files, function(i, file) {
                    if ($this._damnUploaderItemsCount === set.limit) {
                        $this.trigger(limitEvent);
                        return false;
                    }
                    triggerAndAdd(file);
                });
            }
            return true;
        };

        // private file-uploading method
        $this._damnUploaderUploadItem = function(url, item) {
            if (!checkIsFile(item.file)) {
                return false;
            }
            var xhr = new XMLHttpRequest();
            var progress = 0;
            var uploaded = false;
            var prCall = $.isFunction(item.progressCallback);

            if (xhr.upload) {
                xhr.upload.addEventListener("progress", function(e) {
                    if (e.lengthComputable) {
                        progress = (e.loaded * 100) / e.total;
                        prCall && item.progressCallback.call(item, Math.round(progress));
                    }
                }, false);

                xhr.upload.addEventListener("load", function(e) {
                    progress = 100;
                    uploaded = true;
                }, false);
            } else {
                uploaded = true;
            }

            xhr.onreadystatechange = function() {
                var callbackDefined = $.isFunction(item.completeCallback);
                if (this.readyState == 4) {
                    item.cancelled = item.cancelled || false;
                    if (this.status < 400) {
                        if (!uploaded) {
                            callbackDefined && item.completeCallback.call(item, false, null, 0);
                        } else {
                            $.isFunction(item.progressCallback) && item.progressCallback.call(item, 100);
                            var response = set.dataType == 'json' ? $.parseJSON(this.responseText) : this.responseText;
                            callbackDefined && item.completeCallback.call(item, true, response);
                        }
                    } else {
                        callbackDefined && item.completeCallback.call(item, false, null, this.status);
                    }
                }
            };

            var filename = item.replaceName || item.file.name;
            xhr.open("POST", url);

            if ($.support.fileSending) {
                // W3C (IE9, Chrome, Safari, Firefox 4+)
                var formData = new FormData();
                formData.append((item.fieldName || 'file'), item.file, filename);
                if (item._post.length > 0) {
                    $.each(item._post, function(i, field) {
                        formData.append(field.name, field.value);
                    });
                }
                xhr.send(formData);
            } else {
                // Other
                //TODO: need to review
                xhr.setRequestHeader('Upload-Filename', filename);
                xhr.setRequestHeader('Upload-Size', item.file.size);
                xhr.setRequestHeader('Upload-Type', item.file.type);
                xhr.send(item.file);
            }
            item.xhr = xhr;
        }


        ////////////////////////////////////////////////////////////////////////
        // interface elements event handling
        var isFileField = (($this.get(0).tagName == 'INPUT') && (this.attr('type') == 'file'));

        if (isFileField) {
            var myName = $this.eq(0).attr('name');
            if (!$.support.fileSelecting) {
                //TODO: need to review
                if (myName.charAt(myName.length - 1) != ']') {
                    myName += '[]';
                }
                $this.attr('name', myName);
                $this.attr('multiple', false);
                var action = $this.parents('form').attr('action');
                $this._damnUploaderFakeForm = $('<form/>').attr({
                    method: 'post',
                    enctype: 'multipart/form-data',
                    action: action
                }).hide().appendTo('body');
            } else {
                $this.attr('multiple', true);
            }

            $this._damnUploaderChangeCallback = function() {
                $this._damnUploaderFilesAddMap($.support.fileSelecting ? this.files : this);
            };

            $this.on('change', $this._damnUploaderChangeCallback);
        }

        if (set.dropping) {
            $this.on('drop',  function(e) {
                $this._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files);
                return false;
            });
            set.dropBox && $(set.dropBox).on('drop', function(e) {
                $this._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files);
                return false;
            });
        }


        ////////////////////////////////////////////////////////////////////////
        // API control methods

        // Start all uploads
        $this.uploaderStart = function() {
            if (!set.url) {
                return $this;
            }
            if (!$.support.fileSelecting) {
                $this._damnUploaderFakeForm.submit();
                return $this;
            }
            $.each(queue, function(queueId, item) {
                var compl = item.completeCallback;
                item.fieldName = item.fieldName || set.fieldName;
                item.completeCallback = function(successful, data, error) {
                    if (!this.cancelled) {
                        delete queue[queueId];
                        $this._damnUploaderItemsCount--;
                    }
                    if ($.isFunction(compl)) {
                        compl.call(this, successful, data, error);
                    }
                    if ($this._damnUploaderItemsCount == 0) {
                        $this.trigger('uploader.completed');
                    }
                };
                $this._damnUploaderUploadItem(set.url, item);
            });
            return $this;
        };

        // Dequeue upload item by it's id
        $this.uploaderCancel = function(queueId) {
            if (queueId && $this._damnUploaderItemsCount > 0) {
                if (!$.support.fileSelecting) {
                    var removingItem = $('#' + queueId);
                    if (removingItem.length > 0) {
                        removingItem.remove();
                        $this._damnUploaderItemsCount--;
                    }
                    return $this;
                }

                if (queue[queueId] !== undefined) {
                    if (queue[queueId].xhr) {
                        queue[queueId].cancelled = true;
                        queue[queueId].xhr.abort();
                    }
                    delete queue[queueId];
                    $this._damnUploaderItemsCount--;
                }
            }
            return $this;
        };

        // Cancel all uploads & clear queue
        $this.uploaderCancelAll = function() {
            if (!$.support.fileSelecting) {
                $this._damnUploaderItemsCount = 0;
                $this._damnUploaderFakeForm.empty();
                return $this;
            }
            $.each(queue, function(key, item) {
                $this.uploaderCancel(key);
            });
            return $this;
        };

        $this.uploaderNewUploadItem = function(file) {
            return new UploadItem(file);
        };

        // Enqueue upload item
        $this.uploaderAdd = function(uploadItem) {
            if (checkIsFile(uploadItem)) {
                uploadItem = $this.uploaderNewUploadItem(uploadItem);
            }
            if (!(uploadItem instanceof UploadItem)) {
                return false;
            }
            var queueId = uploadItem.id();
            if (uploadItem.file.fake) {
                var input = $(uploadItem.file.inputElement);
                var cloned = $(input).clone();
                $(input).before(cloned);
                $(input).attr('id', queueId);
                $(input).appendTo($this._damnUploaderFakeForm);
                cloned.on({
                    change: $this._damnUploaderChangeCallback
                });
                $this._damnUploaderItemsCount++;
                return queueId;
            }
            if (!checkIsFile(uploadItem.file)) {
                return false;
            }
            queue[queueId] = uploadItem;
            $this._damnUploaderItemsCount++;
            return queueId;
        };

        // Returns queued items count
        $this.uploaderCount = function() {
            return $this._damnUploaderItemsCount;
        };

        // Change plugin option (url, mutliple, fieldName, limit are changeable) or get it value by id
        $this.uploaderOption = function(name, value) {
            var acceptParams = ['url', 'multiple', 'fieldName', 'limit'];
            if (value === undefined) {
                return $this._damnUploaderSettings[name];
            }
            if ($.isPlainObject(name)) {
                $.each(name, function(key, val) {
                    $this.uploaderOption(key, val);
                });
            } else {
                $.inArray(name, acceptParams) && ($this._damnUploaderSettings[key] = value);
            }
            return $this;
        };

        return $this;
    };
})(window, window.jQuery);
