(function ($) {

    // defining compatibility of upload control object
    var xhrUploadFlag = false;
    if (window.XMLHttpRequest) {
        var testXHR = new XMLHttpRequest();
        xhrUploadFlag = (testXHR.upload != null);
    }

    // utility object for checking browser compatibility
    $.extend($.support, {
        fileSelecting: (window.File != null) && (window.FileList != null),
        fileReading: (window.FileReader != null),
        fileSending: (window.FormData != null),
        uploadControl: xhrUploadFlag
    });


    // generates uniq id
    var uniq = function (length, prefix) {
        length = parseInt(length);
        prefix = prefix || '';
        if ((length == 0) || isNaN(length)) {
            return prefix;
        }
        var ch = String.fromCharCode(Math.floor(Math.random() * 26) + 97);
        return prefix + ch + uniq(--length);
    };

    var checkIsFile = function (item) {
        return (item instanceof File) || (item instanceof Blob);
    };

    ////////////////////////////////////////////////////////////////////////////
    // plugin code
    $.fn.damnUploader = function (params) {

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
            onSelect: false,
            onLimitExceeded: false,
            onAllComplete: false
        }, params || {});

        /* private properties */
        $this._damnUploaderQueue = {};
        $this._damnUploaderItemsCount = 0;
        queue = $this._damnUploaderQueue;
        set = $this._damnUploaderSettings;

        /* private items-adding method */
        $this._damnUploaderFilesAddMap = function (files, callback) {
            var callbackDefined = $.isFunction(callback);
            if (!$.support.fileSelecting) {
                if ($this._damnUploaderItemsCount === set.limit) {
                    return $.isFunction(set.onLimitExceeded) ? set.onLimitExceeded.call($this) : false;
                }
                var file = {
                    fake: true,
                    name: files.value,
                    inputElement: files
                };
                if (callbackDefined) {
                    if (!callback.call($this, file)) {
                        return true;
                    }
                }
                $this.damnAdd(file);
                return true;
            }
            if (files instanceof FileList) {
                $.each(files, function (i, file) {
                    if ($this._damnUploaderItemsCount === set.limit) {
                        if ($this._damnUploaderItemsCount === set.limit) {
                            return $.isFunction(set.onLimitExceeded) ? set.onLimitExceeded.call($this) : false;
                        }
                    }
                    if (callbackDefined) {
                        if (!callback.call($this, file)) {
                            return true;
                        }
                    }
                    $this.damnAdd({ file: file });
                });
            }
            return true;
        };


        /* private file-uploading method */
        $this._damnUploaderUploadItem = function (url, item) {
            if (!checkIsFile(item.file)) {
                return false;
            }
            var xhr = new XMLHttpRequest();
            var progress = 0;
            var uploaded = false;

            if (xhr.upload) {
                xhr.upload.addEventListener("progress", function (e) {
                    if (e.lengthComputable) {
                        progress = (e.loaded * 100) / e.total;
                        if ($.isFunction(item.onProgress)) {
                            item.onProgress.call(item, Math.round(progress));
                        }
                    }
                }, false);

                xhr.upload.addEventListener("load", function (e) {
                    progress = 100;
                    uploaded = true;
                }, false);
            } else {
                uploaded = true;
            }

            xhr.onreadystatechange = function () {
                var callbackDefined = $.isFunction(item.onComplete);
                if (this.readyState == 4) {
                    item.cancelled = item.cancelled || false;
                    if (this.status < 400) {
                        if (!uploaded) {
                            if (callbackDefined) {
                                item.onComplete.call(item, false, null, 0);
                            }
                        } else {
                            if ($.isFunction(item.onProgress)) {
                                item.onProgress.call(item, 100);
                            }
                            if (callbackDefined) {
                                item.onComplete.call(item, true, this.responseText);
                            }
                        }
                    } else {
                        if (callbackDefined) {
                            item.onComplete.call(item, false, null, this.status);
                        }
                    }
                }
            };

            var filename = item.replaceName || item.file.name;
            xhr.open("POST", url);

            if ($.support.fileSending) {
                // W3C (Chrome, Safari, Firefox 4+)
                var formData = new FormData();
                formData.append((item.fieldName || 'file'), item.file);
                xhr.send(formData);
            } else {
                // Other
                xhr.setRequestHeader('Upload-Filename', item.file.name);
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

            $this._damnUploaderChangeCallback = function () {
                $this._damnUploaderFilesAddMap($.support.fileSelecting ? this.files : this, set.onSelect);
            };

            $this.on({
                change: $this._damnUploaderChangeCallback
            });
        }

        if (set.dropping) {
            $this.on({
                drop: function (e) {
                    $this._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files, set.onSelect);
                    return false;
                }
            });
            if (set.dropBox) {
                $(set.dropBox).on({
                    drop: function (e) {
                        $this._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files, set.onSelect);
                        return false;
                    }
                });
            }
        }


        ////////////////////////////////////////////////////////////////////////
        // API control methods

        // Start all uploads
        $this.damnStart = function () {
            if (!set.url) {
                return $this;
            }
            if (!$.support.fileSelecting) {
                $this._damnUploaderFakeForm.submit();
                return $this;
            }
            $.each(queue, function (queueId, item) {
                var compl = item.onComplete;
                item.fieldName = item.fieldName || set.fieldName;
                item.onComplete = function (successful, data, error) {
                    if (!this.cancelled) {
                        delete queue[queueId];
                        $this._damnUploaderItemsCount--;
                    }
                    if ($.isFunction(compl)) {
                        compl.call(this, successful, data, error);
                    }
                    if (($this._damnUploaderItemsCount == 0) && ($.isFunction(set.onAllComplete))) {
                        set.onAllComplete.call($this);
                    }
                };
                $this._damnUploaderUploadItem(set.url, item);
            });
            return $this;
        };

        // Dequeue upload item by it's id
        $this.damnCancel = function (queueId) {
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
        $this.damnCancelAll = function () {
            if (!$.support.fileSelecting) {
                $this._damnUploaderItemsCount = 0;
                $this._damnUploaderFakeForm.empty();
                return $this;
            }
            $.each(queue, function (key, item) {
                $this.damnCancel(key);
            });
            return $this;
        };

        // Enqueue upload item
        $this.damnAdd = function (uploadItem) {
            if (!uploadItem || !uploadItem.file) {
                return false;
            }
            var queueId = uniq(5);

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
        $this.damnCount = function () {
            return $this._damnUploaderItemsCount;
        };

        // Change plugin option (url, mutliple, fieldName, limit are changeable) or get it value by id
        $this.damnOption = function (name, value) {
            var acceptParams = ['url', 'multiple', 'fieldName', 'limit'];
            if (value === undefined) {
                return $this._damnUploaderSettings[name];
            }
            if ($.isPlainObject(name)) {
                $.each(name, function (key, val) {
                    $this.damnOption(key, val);
                });
            } else {
                $.inArray(name, acceptParams) && ($this._damnUploaderSettings[key] = value);
            }
            return $this;
        };

        return $this;
    };
})(window.jQuery);
