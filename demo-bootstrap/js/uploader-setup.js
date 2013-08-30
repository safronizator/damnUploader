(function($) {

    $(function() {
        var $fileInput = $('#file-input');
        var $dropBox = $('#drop-box');
        var $uploadForm = $('#upload-form');
        var $uploadRows = $('#upload-rows');
        var $clearBtn = $('#clear-btn');

        $fileInput.damnUploader({
            // куда отправлять
            url: './serverLogic.php',
            // имитация имени поля с файлом (будет ключом в $_FILES, если используется PHP)
            fieldName:  'my-pic',
            // дополнительно: элемент, на который можно перетащить файлы (либо объект jQuery, либо селектор)
            dropBox: $dropBox,
            // максимальное кол-во выбранных файлов (если не указано - без ограничений)
            limit: 5,
            // когда максимальное кол-во достигнуто (вызывается при каждой попытке добавить еще файлы)
            onLimitExceeded: function() {
                log('Допустимое кол-во файлов уже выбрано');
            },
            // ручная обработка события выбора файла (в случае, если выбрано несколько, будет вызвано для каждого)
            // если обработчик возвращает true, файлы добавляются в очередь автоматически
            onSelect: function(file) {
                console.log(file);
                //addFileToQueue(file);
                //return false;
            },
            // когда все загружены
            onAllComplete: function() {
                log('All uploads completed!');
                imgCount = 0;
                imgSize = 0;
                //updateInfo();
            }
        });

        var createRowFromUploadItem = function(ui) {
            var $row = $('<tr/>').prependTo($uploadRows);
            var $progressBar = $('<div/>').addClass('progress-bar').css('width', '0%');
            var $pbWrapper = $('<div/>').addClass('progress').append($progressBar);
            $('<td/>').html('<i>no preview</i>').appendTo($row); // Preview
            $('<td/>').text(ui.file.name).appendTo($row); // Filename
            $('<td/>').text(Math.round(ui.file.size / 1024) + ' KB').appendTo($row); // Size in KB
            $('<td/>').append($pbWrapper).appendTo($row); // Status
            return $progressBar;
        };

        var fileAddHandler = function(e) {
            var ui = e.uploadItem;
            var $progressBar = createRowFromUploadItem(ui);
            ui.completeCallback = function(success, data, errorCode) {
                log('******');
                log(this.file.name + " completed");
                if (success) {
                    log('recieved data:', data);
                } else {
                    log('uploading failed. Response code is:', errorCode);
                }
            };
            ui.progressCallback = function(percent) {
                $progressBar.css('width', Math.round(percent) + '%');
            };
            // e.preventDefault(); // To cancel adding
        };


        $fileInput.on('uploader.add', fileAddHandler);

        $uploadForm.on('submit', function(e) {
            var postData = $uploadForm.serializeArray();
            e.preventDefault();
            $fileInput.uploaderStart();
        });

    });

})(window.jQuery);


// File API support info
if(!$.support.fileSelecting) {
    log("[-] Your browser doesn't support File API (uploads could be performed only by default form sending)");
} else {
    log("[√] Your browser supports multiple file selecting" + ($.support.fileSending ? " and sending" : ""));
    if(!$.support.fileReading) {
        log("[-] Your browser doesn't support file reading on client side");
    }
    if(!$.support.uploadControl) {
        log("[-] Your browser can't retrieve upload progress information (progress bars will be disabled)");
    }
    if(!$.support.fileSending) {
        log("[-] Your browser doesn't support FormData object (files will be send with manually formed requests)");
    }
    log("Now select some files to see what happen ...");
}
