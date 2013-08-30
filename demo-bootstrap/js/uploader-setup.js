(function($) {

    $(function() {
        var $fileInput = $('#file-input');
        var $dropBox = $('#drop-box');
        var $uploadForm = $('#upload-form');
        var $uploadRows = $('#upload-rows');
        var $clearBtn = $('#clear-btn');

        ///// Uploader init
        $fileInput.damnUploader({
            // URL of server uploads handler
            url: './serverLogic.php',
            // File POST field name (for ex., it will be used as key in $_FILES array, if you using PHP)
            fieldName:  'my-pic',
            // Container for handling drag&drops (not required)
            dropBox: $dropBox,
            // Limiting queued files count (if not defined - queue will be unlimited)
            limit: 5,
            // Expected response type ('text' or 'json')
            dataType: 'json'
        });


        ///// Misc funcs

        // Creates queue table row with file information and upload status
        var createRowFromUploadItem = function(ui) {
            var $row = $('<tr/>').prependTo($uploadRows);
            var $progressBar = $('<div/>').addClass('progress-bar').css('width', '0%');
            var $pbWrapper = $('<div/>').addClass('progress').append($progressBar);
            $('<td/>').html('<i>not realized</i>').appendTo($row); // Preview
            $('<td/>').text(ui.file.name).appendTo($row); // Filename
            $('<td/>').text(Math.round(ui.file.size / 1024) + ' KB').appendTo($row); // Size in KB
            $('<td/>').append($pbWrapper).appendTo($row); // Status
            return $progressBar;
        };

        // File adding handler
        var fileAddHandler = function(e) {
            // e.uploadItem represents uploader task as special object,
            // where we can define complete & progress callbacks as well as some another parameters
            // for every single upload
            var ui = e.uploadItem;
            var filename = ui.file.name;
            var $progressBar = createRowFromUploadItem(ui);

            // Show info and response when upload completed
            ui.completeCallback = function(success, data, errorCode) {
                log('******');
                log(this.file.name + " completed");
                if (success) {
                    log('recieved data:', data);
                } else {
                    log('uploading failed. Response code is:', errorCode);
                }
            };

            // Updating progress bar value in progress callback
            ui.progressCallback = function(percent) {
                $progressBar.css('width', Math.round(percent) + '%');
            };

            // We can replace original filename if needed
            if (filename.length > 14) {
                ui.replaceName = filename.substr(0, 10) + "_" + filename.substr(filename.lastIndexOf('.'));
            }

            // We can add some data to POST in upload request
            ui.addPostData($uploadForm.serializeArray()); // from array
            ui.addPostData('original-filename', filename); // .. or as field/value pair

            // e.preventDefault(); // To cancel adding
        };


        ///// Setting up events handlers

        // Uploader events
        $fileInput.on({
            'uploader.add' : fileAddHandler,

            'uploader.limit' : function() {
                log("File upload limit exceeded!");
            },

            'uploader.completed' : function() {
                log('******');
                log("All uploads completed!");
            }
        });

        // Clear button
        $clearBtn.on('click', function() {
            $fileInput.uploaderCancelAll();
            $uploadRows.empty();
            log('******');
            log("All uploads canceled :(");
        });

        // Form submit
        $uploadForm.on('submit', function(e) {
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
