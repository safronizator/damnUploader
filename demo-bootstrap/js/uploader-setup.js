(function($) {

    $(function() {
        var $fileInput = $('#file-input');
        var $dropBox = $('#drop-box');

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
    log("select some files to see what happen ...");
}
