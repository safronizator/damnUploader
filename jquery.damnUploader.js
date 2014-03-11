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

    // checks that item is File instance or Blob [that have File compatible API]
    var checkIsFile = function(item) {
        return (item instanceof File) || (item instanceof Blob);
    };

    // makes blob object with data of defined mime-type
    var makeBlob = function(data, mimeType) {
        if (window.Blob) {
            return new Blob([data], {type: mimeType});
        }
        var BlobBuilder = (window.MSBlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder);
        return BlobBuilder ? (new BlobBuilder()).append(ab).getBlob(mimeType) : null;
    };

    // checks that given argument is dataURI-string
    var isDataURI = function(data) {
        return data.substr(0, 5) == 'data:';
    };

    // trying to convert custom data (or dataURI) to Blob
    var dataToBlob = function(data) {
        data = isDefined(data.toString) ? data.toString() : ("" + data);
        var mimeString = "text/plain";
        if (isDataURI(data)) {
            var pieces = data.split(',');
            var byteString = (pieces[0].indexOf('base64') >= 0) ? atob(pieces[1]) : unescape(pieces[1]);
            // separate out the mime component
            mimeString = pieces[0].split(':')[1].split(';')[0];
            // write the bytes of the string to an ArrayBuffer
            data = new ArrayBuffer(byteString.length);
            var ia = new Uint8Array(data);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
        }
        return makeBlob(data, mimeString);
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

        ////////////////////////////////////////////////////////////////////////
        // initialization

        /* default settings */
        $this._duSettings = $.extend({
            url: '/upload.php',
            multiple: true,
            fieldName: 'file',
            dropping: true,
            dropBox: false,
            limit: false,
            dataType: 'text'
        }, params || {});

        !$this._duSettings.multiple && ($this._duSettings.limit = 1);

        // upload item object
        var UploadItem = function(file, completeCallback, progressCallback) {
            this.file = file;
            this.fieldName = null;
            this.replaceName = null;
            this.progressCallback = progressCallback;
            this.completeCallback = completeCallback;
            this.xhr = null;
            this.cancelled = false;
            this.started = false;
            this.completed = false;
            this._id = uniq(7);
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
            upload: function() {
                $this._duUploadItem(this);
            },
            cancel: function() {
                $this.duCancel(this._id);
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
        $this._duQueue = {};
        $this._duItemsCount = 0;

        // locals
        var queue = $this._duQueue;
        var set = $this._duSettings;

        // private method for items ading
        $this._duAddItemsToQueue = function(item) {
            var addingEvent = $.Event("du.add");
            var limitEvent = $.Event("du.limit");
            var ui;
            if ($this._duItemsCount === set.limit) {
                $this.trigger(limitEvent);
                return false;
            }
            if (item instanceof FileList) {
                var ret = [];
                $.each(item, function(i, file) {
                    ret.push($this._duAddItemsToQueue(file));
                });
                return ret;
            } else if ((ui = $this.duNewUploadItem(item)) === false) {
                return false;
            }
            addingEvent.uploadItem = ui;
            $this.trigger(addingEvent);
            if (addingEvent.isDefaultPrevented()) {
                return false;
            }
            var queueId = ui.id();
            $this._duItemsCount++;
            queue[queueId] = ui;
            return ui;
        };

        // private file-uploading method
        $this._duUploadItem = function(item) {
            if (!$.support.fileSending || !checkIsFile(item.file)) {
                return false;
            }
            if (item.started) {
                return ;
            }
            item.started = true;
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
                    item.completed = true;
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
            xhr.open("POST", set.url);

            // W3C (IE9, Chrome, Safari, Firefox 4+)
            var formData = new FormData();
            formData.append((item.fieldName || set.fieldName || 'file'), item.file, filename);
            if (item._post.length > 0) {
                $.each(item._post, function(i, field) {
                    formData.append(field.name, field.value);
                });
            }
            xhr.send(formData);
            item.xhr = xhr;
        }


        ////////////////////////////////////////////////////////////////////////
        // interface elements event handling
        var isFileField = (($this.get(0).tagName == 'INPUT') && (this.attr('type') == 'file'));

        if (isFileField) {
            $this.prop('multiple', set.multiple).on('change', function() {
                $this._duAddItemsToQueue(this.files);
            });
        }

        if (set.dropping) {
            //TODO: need to review
            $this.on('drop',  function(e) {
                $this._duAddItemsToQueue(e.originalEvent.dataTransfer.files);
                return false;
            });
            set.dropBox && $(set.dropBox).on('drop', function(e) {
                $this._duAddItemsToQueue(e.originalEvent.dataTransfer.files);
                return false;
            });
        }


        ////////////////////////////////////////////////////////////////////////
        // API control methods

        // Start all uploads
        $this.duStart = function() {
            if (!set.url) {
                return $this;
            }
            $.each(queue, function(queueId, item) {
                var compl = item.completeCallback;
                item.completeCallback = function(successful, data, error) {
                    if (!this.cancelled) {
                        delete queue[queueId];
                        $this._duItemsCount--;
                    }
                    if ($.isFunction(compl)) {
                        compl.call(this, successful, data, error);
                    }
                    if ($this._duItemsCount == 0) {
                        $this.trigger('du.completed');
                    }
                };
                $this._duUploadItem(item);
            });
            return $this;
        };

        // Dequeue upload item by it's id
        $this.duCancel = function(queueId) {
            if (queueId && $this._duItemsCount > 0) {
                if (isDefined(queue[queueId])) {
                    if (queue[queueId].xhr) {
                        queue[queueId].cancelled = true;
                        queue[queueId].xhr.abort();
                    }
                    delete queue[queueId];
                    $this._duItemsCount--;
                }
            }
            return $this;
        };

        // Cancel all uploads & clear queue
        $this.duCancelAll = function() {
            isFileField && $this.val('');
            $.each(queue, function(key, _) {
                $this.duCancel(key);
            });
            return $this;
        };

        // Creates UploadItem object from File object or from custom data
        $this.duNewUploadItem = function(fileOrData) {
            switch(true) {
                case fileOrData instanceof UploadItem:
                    return fileOrData;
                case checkIsFile(fileOrData):
                    return new UploadItem(fileOrData);
                default:
                    var blob = dataToBlob(fileOrData);
                    return (blob !== false) ? $this.duNewUploadItem(blob) : false;
            }
        };

        // Enqueue upload item
        $this.duEnqueue = function(item) {
            return $this._duAddItemsToQueue(item);
        };

        // Returns all upload queue
        $this.duGetQueue = function() {
            return $this._duQueue;
        };

        // Returns queued items count
        $this.duCount = function() {
            return $this._duItemsCount;
        };

        // Change plugin option (url, fieldName, limit, dataType are changeable), or get it value by name
        $this.duOption = function(name, value) {
            var acceptParams = ['url', 'fieldName', 'limit', 'dataType'];
            if ($.isPlainObject(name)) {
                $.each(name, function(key, val) {
                    $this.duOption(key, val);
                });
            } else if (value === undefined) {
                return $this._duSettings[name];
            } else if ($.inArray(name, acceptParams) > -1) {
                $this._duSettings[name] = value;
            }
            return $this;
        };

        return $this;
    };
})(window, window.jQuery);
