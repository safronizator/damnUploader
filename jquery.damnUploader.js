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


    // generating uniq id
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
        var self = this;

        // locals
        var queue = self._damnUploaderQueue;
        var set = self._damnUploaderSettings || {};

        ////////////////////////////////////////////////////////////////////////
        // initialization
        /* default settings */
        self._damnUploaderSettings = $.extend({
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
        self._damnUploaderQueue = {};
        self._damnUploaderItemsCount = 0;
        queue = self._damnUploaderQueue;
        set = self._damnUploaderSettings;

        /* private items-adding method */
        self._damnUploaderFilesAddMap = function (files, callback) {
            var callbackDefined = $.isFunction(callback);
            if (!$.support.fileSelecting) {
                if (self._damnUploaderItemsCount === set.limit) {
                    return $.isFunction(set.onLimitExceeded) ? set.onLimitExceeded.call(self) : false;
                }
                var file = {
                    fake: true,
                    name: files.value,
                    inputElement: files
                };
                if (callbackDefined) {
                    if (!callback.call(self, file)) {
                        return true;
                    }
                }
                self.duAdd(file);
                return true;
            }
            if (files instanceof FileList) {
                $.each(files, function (i, file) {
                    if (self._damnUploaderItemsCount === set.limit) {
                        if (self._damnUploaderItemsCount === set.limit) {
                            return $.isFunction(set.onLimitExceeded) ? set.onLimitExceeded.call(self) : false;
                        }
                    }
                    if (callbackDefined) {
                        if (!callback.call(self, file)) {
                            return true;
                        }
                    }
                    self.duAdd({ file: file });
                });
            }
            return true;
        };


        /* private file-uploading method */
        self._damnUploaderUploadItem = function (url, item) {
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



        /* binding callbacks */
        var isFileField = ((self.get(0).tagName == 'INPUT') && (this.attr('type') == 'file'));

        if (isFileField) {
            var myName = self.eq(0).attr('name');
            if (!$.support.fileSelecting) {
                if (myName.charAt(myName.length - 1) != ']') {
                    myName += '[]';
                }
                self.attr('name', myName);
                self.attr('multiple', false);
                var action = self.parents('form').attr('action');
                self._damnUploaderFakeForm = $('<form/>').attr({
                    method: 'post',
                    enctype: 'multipart/form-data',
                    action: action
                }).hide().appendTo('body');
            } else {
                self.attr('multiple', true);
            }

            self._damnUploaderChangeCallback = function () {
                self._damnUploaderFilesAddMap($.support.fileSelecting ? this.files : this, set.onSelect);
            };

            self.on({
                change: self._damnUploaderChangeCallback
            });
        }

        if (set.dropping) {
            self.on({
                drop: function (e) {
                    self._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files, set.onSelect);
                    return false;
                }
            });
            if (set.dropBox) {
                $(set.dropBox).on({
                    drop: function (e) {
                        self._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files, set.onSelect);
                        return false;
                    }
                });
            }
        }

        self.duStart = function () {
            if (!set.url) {
                return self;
            }
            if (!$.support.fileSelecting) {
                self._damnUploaderFakeForm.submit();
                return self;
            }
            $.each(queue, function (queueId, item) {
                var compl = item.onComplete;
                item.fieldName = item.fieldName || set.fieldName;
                item.onComplete = function (successful, data, error) {
                    if (!this.cancelled) {
                        delete queue[queueId];
                        self._damnUploaderItemsCount--;
                    }
                    if ($.isFunction(compl)) {
                        compl.call(this, successful, data, error);
                    }
                    if ((self._damnUploaderItemsCount == 0) && ($.isFunction(set.onAllComplete))) {
                        set.onAllComplete.call(self);
                    }
                };
                self._damnUploaderUploadItem(set.url, item);
            });
            return self;
        };

        self.duCancel = function (queueId) {
            if (queueId && self._damnUploaderItemsCount > 0) {
                if (!$.support.fileSelecting) {
                    var removingItem = $('#' + queueId);
                    if (removingItem.length > 0) {
                        removingItem.remove();
                        self._damnUploaderItemsCount--;
                    }
                    return self;
                }

                if (queue[queueId] !== undefined) {
                    if (queue[queueId].xhr) {
                        queue[queueId].cancelled = true;
                        queue[queueId].xhr.abort();
                    }
                    delete queue[queueId];
                    self._damnUploaderItemsCount--;
                }
            }
            return self;
        };

        self.duCancelAll = function () {
            if (!$.support.fileSelecting) {
                self._damnUploaderItemsCount = 0;
                self._damnUploaderFakeForm.empty();
                return self;
            }
            $.each(queue, function (key, item) {
                self.duCancel(key);
            });
            return self;
        };

        self.duAdd = function (uploadItem) {
            if (!uploadItem || !uploadItem.file) {
                return false;
            }
            var queueId = uniq(5);

            if (uploadItem.file.fake) {
                var input = $(uploadItem.file.inputElement);
                var cloned = $(input).clone();
                $(input).before(cloned);
                $(input).attr('id', queueId);
                $(input).appendTo(self._damnUploaderFakeForm);
                cloned.on({
                    change: self._damnUploaderChangeCallback
                });
                self._damnUploaderItemsCount++;
                return queueId;
            }
            if (!checkIsFile(uploadItem.file)) {
                return false;
            }
            queue[queueId] = uploadItem;
            self._damnUploaderItemsCount++;
            return queueId;
        };

        self.duCount = function () {
            return self._damnUploaderItemsCount;
        };

        self.duOption = function (name, value) {
            var acceptParams = ['url', 'multiple', 'fieldName', 'limit'];
            if (value === undefined) {
                return self._damnUploaderSettings[name];
            }
            if ($.isPlainObject(name)) {
                $.each(name, function (key, val) {
                    self.duOption(key, val);
                });
            } else {
                $.inArray(name, acceptParams) && (self._damnUploaderSettings[key] = value);
            }
            return self;
        };


        return self;
    };
})(window.jQuery);