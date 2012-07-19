$(document).ready(function() {


    // Консоль
    var $console = $("#console");

    // Инфа о выбранных файлах
    var countInfo = $("#info-count");
    var sizeInfo = $("#info-size");

    // ul-список, содержащий миниатюрки выбранных файлов
    var imgList = $('#img-list');

    // Контейнер, куда можно помещать файлы методом drag and drop
    var dropBox = $('#img-container');

    // Счетчик всех выбранных файлов и их размера
    var imgCount = 0;
    var imgSize = 0;


    // Стандарный input для файлов
    var fileInput = $('#file-field');

    // Тестовый canvas
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect (0, 0, 150, 150);
    ctx.fillStyle = "rgb(200,0,0)";
    ctx.fillRect (10, 10, 55, 50);
    ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
    ctx.fillRect (30, 30, 55, 50);


    ////////////////////////////////////////////////////////////////////////////
    // Подключаем и настраиваем плагин загрузки

    fileInput.damnUploader({
        // куда отправлять
        url: './serverLogic.php',
        // имитация имени поля с файлом (будет ключом в $_FILES, если используется PHP)
        fieldName:  'my-pic',
        // дополнительно: элемент, на который можно перетащить файлы (либо объект jQuery, либо селектор)
        dropBox: dropBox,
        // максимальное кол-во выбранных файлов (если не указано - без ограничений)
        limit: 5,
        // когда максимальное кол-во достигнуто (вызывается при каждой попытке добавить еще файлы)
        onLimitExceeded: function() {
            log('Допустимое кол-во файлов уже выбрано');
        },
        // ручная обработка события выбора файла (в случае, если выбрано несколько, будет вызвано для каждого)
        // если обработчик возвращает true, файлы добавляются в очередь автоматически
        onSelect: function(file) {
            addFileToQueue(file);
            return false;
        },
        // когда все загружены
        onAllComplete: function() {
            log('<span style="color: blue;">*** Все загрузки завершены! ***</span>');
            imgCount = 0;
            imgSize = 0;
            updateInfo();
        }
    });



    ////////////////////////////////////////////////////////////////////////////
    // Вспомогательные функции

    // Вывод в консоль
    function log(str) {
        $('<p/>').html(str).prependTo($console);
    }

    // Вывод инфы о выбранных
    function updateInfo() {
        countInfo.text( (imgCount == 0) ? 'Изображений не выбрано' : ('Изображений выбрано: '+imgCount));
        sizeInfo.text( (imgSize == 0) ? '-' : Math.round(imgSize / 1024));
    }

    // Обновление progress bar'а
    function updateProgress(bar, value) {
        var width = bar.width();
        var bgrValue = -width + (value * (width / 100));
        bar.attr('rel', value).css('background-position', bgrValue+'px center').text(value+'%');
    }

    // преобразование формата dataURI в Blob-данные
    function dataURItoBlob(dataURI) {
        var BlobBuilder = (window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder);
        if (!BlobBuilder) {
            return false;
        }
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs
        var pieces = dataURI.split(',');
        var byteString = (pieces[0].indexOf('base64') >= 0) ? atob(pieces[1]) : unescape(pieces[1]);
        // separate out the mime component
        var mimeString = pieces[0].split(':')[1].split(';')[0];
        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        // write the ArrayBuffer to a blob, and you're done
        var bb = new BlobBuilder();
        bb.append(ab);
        return bb.getBlob(mimeString);
    }



    // Отображение выбраных файлов, создание миниатюр и ручное добавление в очередь загрузки.
    function addFileToQueue(file) {

        // Создаем элемент li и помещаем в него название, миниатюру и progress bar
        var li = $('<li/>').appendTo(imgList);
        var title = $('<div/>').text(file.name+' ').appendTo(li);
        var cancelButton = $('<a/>').attr({
            href: '#cancel',
            title: 'отменить'
        }).text('X').appendTo(title);

        // Если браузер поддерживает выбор файлов (иначе передается специальный параметр fake,
        // обозночающий, что переданный параметр на самом деле лишь имитация настоящего File)
        if(!file.fake) {

            // Отсеиваем не картинки
            var imageType = /image.*/;
            if (!file.type.match(imageType)) {
                log('Файл отсеян: `'+file.name+'` (тип '+file.type+')');
                return true;
            }

            // Добавляем картинку и прогрессбар в текущий элемент списка
            var img = $('<img/>').appendTo(li);
            var pBar = $('<div/>').addClass('progress').attr('rel', '0').text('0%').appendTo(li);

            // Создаем объект FileReader и по завершении чтения файла, отображаем миниатюру и обновляем
            // инфу обо всех файлах (только в браузерах, подерживающих FileReader)
            if($.support.fileReading) {
                var reader = new FileReader();
                reader.onload = (function(aImg) {
                    return function(e) {
                        aImg.attr('src', e.target.result);
                        aImg.attr('width', 150);
                    };
                })(img);
                reader.readAsDataURL(file);
            }

            log('Картинка добавлена: `'+file.name + '` (' +Math.round(file.size / 1024) + ' Кб)');
            imgSize += file.size;
        } else {
            log('Файл добавлен: '+file.name);
        }

        imgCount++;
        updateInfo();

        // Создаем объект загрузки
        var uploadItem = {
            file: file,
            onProgress: function(percents) {
                updateProgress(pBar, percents);
            },
            onComplete: function(successfully, data, errorCode) {
                if(successfully) {
                    log('Файл `'+this.file.name+'` загружен, полученные данные:<br/>*****<br/>'+data+'<br/>*****');
                } else {
                    if(!this.cancelled) {
                        log('<span style="color: red;">Файл `'+this.file.name+'`: ошибка при загрузке. Код: '+errorCode+'</span>');
                    }
                }
            }
        };

        // ... и помещаем его в очередь
        var queueId = fileInput.damnUploader('addItem', uploadItem);

        // обработчик нажатия ссылки "отмена"
        cancelButton.click(function() {
            fileInput.damnUploader('cancel', queueId);
            li.remove();
            imgCount--;
            imgSize -= file.fake ? 0 : file.size;
            updateInfo();
            log(file.name+' удален из очереди');
            return false;
        });

        return uploadItem;
    }




    ////////////////////////////////////////////////////////////////////////////
    // Обработчики событий


    // Обработка событий drag and drop при перетаскивании файлов на элемент dropBox
    dropBox.bind({
        dragenter: function() {
            $(this).addClass('highlighted');
            return false;
        },
        dragover: function() {
            return false;
        },
        dragleave: function() {
            $(this).removeClass('highlighted');
            return false;
        }
    });


    // Обаботка события нажатия на кнопку "Загрузить все".
    // стартуем все загрузки
    $("#upload-all").click(function() {
        fileInput.damnUploader('startUpload');
    });


    // Обработка события нажатия на кнопку "Отменить все"
    $("#cancel-all").click(function() {
        fileInput.damnUploader('cancelAll');
        imgCount = 0;
        imgSize = 0;
        updateInfo();
        log('*** Все загрузки отменены ***');
        imgList.empty();
    });


    // Обработка нажатия на тестовую канву
    $(canvas).click(function() {
        var blobData;
        if (canvas.toBlob) {
            // ожидается, что вскоре браузерами будет поддерживаться метод toBlob() для объектов Canvas
            blobData = canvas.toBlob();
        } else {
            // ... а пока - конвертируем вручную из dataURI
            blobData = dataURItoBlob(canvas.toDataURL('image/png'));
        }
        if (blobData === false) {
            log("Ваш браузер не поддерживает BlobBuilder");
            return ;
        }
        addFileToQueue(blobData)
    });




    ////////////////////////////////////////////////////////////////////////////
    // Проверка поддержки File API, FormData и FileReader

    if(!$.support.fileSelecting) {
        log('Ваш браузер не поддерживает выбор файлов (загрузка будет осуществлена обычной отправкой формы)');
        $("#dropBox-label").text('если бы ты использовал хороший браузер, файлы можно было бы перетаскивать прямо в область ниже!');
    } else {
        if(!$.support.fileReading) {
            log('* Ваш браузер не умеет читать содержимое файлов (миниатюрки не будут показаны)');
        }
        if(!$.support.uploadControl) {
            log('* Ваш браузер не умеет следить за процессом загрузки (progressbar не работает)');
        }
        if(!$.support.fileSending) {
            log('* Ваш браузер не поддерживает объект FormData (отправка с ручной формировкой запроса)');
        }
        log('Выбор файлов поддерживается');
    }
    log('*** Проверка поддержки ***');


});