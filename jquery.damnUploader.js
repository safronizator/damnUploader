/**
 * jQuery-плагин, облегчающий загрузку файлов на сервер.
 *
 * Принцип работы: инициируется для input type="file", либо для контейнера, куда можно будет
 * перетаскивать файлы, однако и в первом случае можно указать контейнер, который также
 * будет принимать перетаскиваемые файлы помимо стандартного поля выбора.
 * Если загрузка файлов через file API невозможна, то при вызове метода начала загрузки, просто
 * будет инициирована отправка формы, содержащей поле выбора.
 *
 * Данное расширение также добавляет свойства в стандартный jQuery-объект $.support,
 * позволяющие проверить степень поддержки браузером File API:
 * $.support.fileSelecting - возможность выбора и загрузки файлов через File API
 * $.support.fileReading   - возможность прочитать содержимое файла на стороне клиента
 * $.support.fileSending   - возможность отправки файла при помощи FormData (как рекомендует W3C),
 *                           однако, если содержит false, загрузка будет выполнена при помощи
 *                           ручной формировки тела запроса
 * $.support.uploadControl - возможность следить за процессом загрузки (индикация выполнения)
 *
 *
 * **********************
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ:
 * $("input[type='file']").damnUploader({
 *     url: './serverLogic.php',
 *     dropBox: $("#drop-files-here"),
 *     onAllComplete :function() {
 *         alert('ready!');
 *     }
 * });
 *
 * **********************
 * ПРИНИМАЕМЫЕ ПАРАМЕТРЫ (в скобках - значения по умолч.):
 *
 * url       - адрес, куда будут отправляться файлы ('upload.php')
 * multiple  - возможность выбора нескольких файлов (true)
 * fieldName - имитация имени поля с файлом, кторое будет ключом в $_FILES, если используется PHP ('file')
 * dropping  - вкл./выключить drag'n'drop файлов. Имеет смысл, если передается параметр dropBox (false)
 * dropBox   - jQuery-набор или селектор, содержащий контейнер, на который можно перетаскивать файлы (null)
 * limit     - максимальное допустимое кол-во файлов в очереди, если параметр multiple включен (false - неограниченно)
 *
 * **********************
 * ОБРАБОТЧИКИ СОБЫТИЙ (в скобках - параметры, передаваемые в функцию обратного вызова):
 *
 * onSelect(file - встроенный объект File)
 * вызывается при выборе файла, если выбирается сразу несколько,
 * то для каждого вызывается отдельно. Если функция возвращает false, то файл не добавляется в очередь
 * автоматически, благодаря чему можно получить контроль над добавлением файлов, назначая каждому
 * свои обработчики событий onComplete и onProgress (см. метод addItem)
 *
 * onLimitExceeded ()
 * вызывается, если превышен лимит, установленный параметром limit
 *
 * onAllComplete ()
 * вызывается, когда вся очередь загружена
 *
 * **********************
 * МЕТОДЫ.
 *
 * // Пример вызова:
 * var myUploader = $("input[type='file']").damnUploader({
 *     url: './serverLogic.php'
 * });
 * myUploader.damnUploader('addItem', uploadItem);
 * // здесь вызывается метод addItem, который добавляет в очередь специально подготовленный объект для загрузки
 *
 * ОПИСАНИЕ МЕТОДОВ:
 *
 * damnUploader('addItem', uploadItem)
 * добавляет в очередь специально подготовленный объект для загрузки,
 * содержащий встроенный объект File и функции обратного вызова (необязательно).
 * Метод возвращает уникальный id, присвоенный данному объекту (по которому можно,
 * например, отменить загрузку конкретного файла).
 * В следующем примере перехватывается стандартное добавление файла в очередь и создается собственный объект загрузки:
 * $("input[type='file']").damnUploader({
 *     onSelect: function(file) {
 *         var uploadId = this.damnUploader('addItem', {
 *             file: file,
 *             onProgress: function(percents) { .. Some code, updating progress info .. },
 *             onComplete: function(successfully, data, errorCode) {
 *                 if (successfully) {
 *                     alert('Файл '+file.name+' загружен, полученные данные: '+data);
 *                 } else {
 *                     alert('Ошибка при загрузке. Код ошибки: '+errorCode); // errorCode содержит код HTTP-ответа, либо 0 при проблеме с соединением
 *                 }
 *             }
 *         });
 *         return false; // отменить стандартную обработку выбора файла
 *     }
 * });
 *
 * damnUploader('startUpload')
 * начать загрузку файлов
 *
 * damnUploader('itemsCount')
 * возвращает кол-во файлов в очереди
 *
 * damnUploader('cancelAll')
 * остановить все текущие загрузки и удалить все файлы из очереди
 *
 * damnUploader('cancel', queueId)
 * отменяет загрузку для файла queueId (queueId возвращается методом addItem)
 *
 * damnUploader('setParam', paramsArray)
 * изменить один, или несколько параметров. Например:
 * myUploader.setParam({
 *     url: 'anotherWay.php'
 * });
 */

(function($) {

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
    function uniq(length, prefix) {
        length = parseInt(length);
        prefix = prefix || '';
        if ((length == 0) || isNaN(length)) {
            return prefix;
        }
        var ch = String.fromCharCode(Math.floor(Math.random() * 26) + 97);
        return prefix + ch + uniq(--length);
    }

    function checkIsFile(item) {
        return (item instanceof File) || (item instanceof Blob);
    }

    ////////////////////////////////////////////////////////////////////////////
    // plugin code
    $.fn.damnUploader = function(params, data) {

        if (this.length == 0) {
            return this;
        }

        // context
        var self = this;

        // locals
        var queue = self._damnUploaderQueue;
        var set = self._damnUploaderSettings || {};

        ////////////////////////////////////////////////////////////////////////
        // initialization (on first call)
        if (!params || $.isPlainObject(params)) {

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
            self._damnUploaderFilesAddMap = function(files, callback) {
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
                    self.damnUploader('addItem', file);
                    return true;
                }
                if (files instanceof FileList) {
                    $.each(files, function(i, file) {
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
                        self.damnUploader('addItem', {
                            file: file
                        });
                    });
                }
                return true;
            };


            /* private file-uploading method */
            self._damnUploaderUploadItem = function(url, item) {
                if (!checkIsFile(item.file)) {
                    return false;
                }
                var xhr = new XMLHttpRequest();
                var progress = 0;
                var uploaded = false;

                if (xhr.upload) {
                    xhr.upload.addEventListener("progress", function(e) {
                        if (e.lengthComputable) {
                            progress = (e.loaded * 100) / e.total;
                            if ($.isFunction(item.onProgress)) {
                                item.onProgress.call(item, Math.round(progress));
                            }
                        }
                    }, false);

                    xhr.upload.addEventListener("load", function(e){
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
                } else if ($.support.fileReading && xhr.sendAsBinary) {
                    // firefox < 4
                    var boundary = "xxxxxxxxx";
                    xhr.setRequestHeader("Content-Type", "multipart/form-data, boundary="+boundary);
                    xhr.setRequestHeader("Cache-Control", "no-cache");
                    var body = "--" + boundary + "\r\n";
                    filename = unescape(encodeURIComponent(filename));
                    body += "Content-Disposition: form-data; name='"+(item.fieldName || 'file')+"'; filename='" + filename + "'\r\n";
                    body += "Content-Type: application/octet-stream\r\n\r\n";
                    body += (item.file.getAsBinary ? item.file.getAsBinary() : item.file.readAsBinary()) + "\r\n";
                    body += "--" + boundary + "--";
                    xhr.sendAsBinary(body);
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
                    if (myName.charAt(myName.length-1) != ']') {
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

                self._damnUploaderChangeCallback = function() {
                    self._damnUploaderFilesAddMap($.support.fileSelecting ? this.files : this, set.onSelect);
                };

                self.on({
                    change: self._damnUploaderChangeCallback
                });
            }

            if (set.dropping) {
                self.on({
                    drop: function(e) {
                        self._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files, set.onSelect);
                        return false;
                    }
                });
                if (set.dropBox) {
                    $(set.dropBox).on({
                        drop: function(e) {
                            self._damnUploaderFilesAddMap(e.originalEvent.dataTransfer.files, set.onSelect);
                            return false;
                        }
                    });
                }
            }
            return self;
        }


        ////////////////////////////////////////////////////////////////////
        // controls
        switch(params) {

            case 'addItem':
                if (!data) {
                    return false;
                }
                var queueId = uniq(5);

                if (data.file.fake) {
                    var input = $(data.file.inputElement);
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
                if (!checkIsFile(data.file)) {
                    return false;
                }
                queue[queueId] = data;
                self._damnUploaderItemsCount++;
                return queueId;
                break;


            case 'startUpload':
                if (!set.url) {
                    return self;
                }
                if (!$.support.fileSelecting) {
                    self._damnUploaderFakeForm.submit();
                    return self;
                }
                $.each(queue, function(queueId, item) {
                    var compl = item.onComplete;
                    item.fieldName = item.fieldName || set.fieldName;
                    item.onComplete = function(successful, data, error) {
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
                break;


            case 'itemsCount':
                return self._damnUploaderItemsCount;
                break;


            case 'cancelAll':
                if (!$.support.fileSelecting) {
                    self._damnUploaderItemsCount = 0;
                    self._damnUploaderFakeForm.empty();
                    return self;
                }
                $.each(queue, function(key, item) {
                    self.damnUploader('cancel', key);
                });
                break;


            case 'cancel':
                var queueId = data.toString();
                if (self._damnUploaderItemsCount > 0) {

                    if (!$.support.fileSelecting) {
                        var removingItem = $('#'+queueId);
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
                break;


            case 'setParam':
                var acceptParams = ['url', 'multiple', 'fieldName', 'limit'];
                $.each(data, function(key, val) {
                    if ($.inArray(key, acceptParams)) {
                        self._damnUploaderSettings[key] = val;
                    }
                });
                break;
        }

        return self;
    };

})(window.jQuery);