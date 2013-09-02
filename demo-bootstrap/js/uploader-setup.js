(function($) {

    $(function() {
        var $fileInput = $('#file-input');
        var $dropBox = $('#drop-box');
        var $uploadForm = $('#upload-form');
        var $uploadRows = $('#upload-rows');
        var $clearBtn = $('#clear-btn');
        var $canvasAddBtn = $('#canvas-add-btn');
        var canvas = document.getElementById('canvas');
        var $textAddBtn = $('#text-add-btn');
        var $previewsChecker = $('#previews-checker');
        var previewsOn = true;

        ///// Uploader init
        $fileInput.damnUploader({
            // URL of server-side upload handler
            url: './serverLogic.php',
            // File POST field name (for ex., it will be used as key in $_FILES array, if you using PHP)
            fieldName:  'my-file',
            // Container for handling drag&drops (not required)
            dropBox: $dropBox,
            // Limiting queued files count (if not defined - queue will be unlimited)
            limit: 5,
            // Expected response type ('text' or 'json')
            dataType: 'json'
        });


        ///// Misc funcs

        var isTextFile = function(file) {
            return file.type == 'text/plain';
        };

        var isImgFile = function(file) {
            return file.type.match(/image.*/);
        };


        // Creates queue table row with file information and upload status
        var createRowFromUploadItem = function(ui) {
            var $row = $('<tr/>').prependTo($uploadRows);
            var $progressBar = $('<div/>').addClass('progress-bar').css('width', '0%');
            var $pbWrapper = $('<div/>').addClass('progress').append($progressBar);

            // Defining cancel button & its handler
            var $cancelBtn = $('<a/>').attr('href', 'javascript:').append(
                $('<span/>').addClass('glyphicon glyphicon-remove')
            ).on('click', function() {
                var $statusCell =  $pbWrapper.parent();
                $statusCell.empty().html('<i>cancelled</i>');
                ui.cancel();
                log((ui.file.name || "[custom-data]") + " canceled");
            });

            // Generating preview
            var $preview;
            if (previewsOn) {
                if (isImgFile(ui.file)) {
                    // image preview (note: might work slow with large images)
                    $preview = $('<img/>').attr('width', 120);
                    ui.readAs('DataURL', function(e) {
                        $preview.attr('src', e.target.result);
                    });
                } else {
                    // plain text preview
                    $preview = $('<i/>');
                    ui.readAs('Text', function(e) {
                        $preview.text(e.target.result.substr(0, 15) + '...');
                    });
                }
            } else {
                $preview = $('<i>no preview</i>');
            }

            // Appending cells to row
            $('<td/>').append($preview).appendTo($row); // Preview
            $('<td/>').text(ui.file.name).appendTo($row); // Filename
            $('<td/>').text(Math.round(ui.file.size / 1024) + ' KB').appendTo($row); // Size in KB
            $('<td/>').append($pbWrapper).appendTo($row); // Status
            $('<td/>').append($cancelBtn).appendTo($row); // Cancel button
            return $progressBar;
        };

        // File adding handler
        var fileAddHandler = function(e) {
            // e.uploadItem represents uploader task as special object,
            // that allows us to define complete & progress callbacks as well as some another parameters
            // for every single upload
            var ui = e.uploadItem;
            var filename = ui.file.name || ""; // Filename property may be absent when adding custom data

            // We can call preventDefault() method of event to cancel adding
            if (!isTextFile(ui.file) && !isImgFile(ui.file)) {
                log(filename + ": is not image. Only images & plain text files accepted!");
                e.preventDefault();
                return ;
            }

            // We can replace original filename if needed
            if (!filename.length) {
                ui.replaceName = "custom-data";
            } else if (filename.length > 14) {
                ui.replaceName = filename.substr(0, 10) + "_" + filename.substr(filename.lastIndexOf('.'));
            }

            // We can add some data to POST in upload request
            ui.addPostData($uploadForm.serializeArray()); // from array
            ui.addPostData('original-filename', filename); // .. or as field/value pair

            // Show info and response when upload completed
            var $progressBar = createRowFromUploadItem(ui);
            ui.completeCallback = function(success, data, errorCode) {
                log('******');
                log((this.file.name || "[custom-data]") + " completed");
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

            // To start uploads immediately as added
            // ui.upload();
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
            $fileInput.duCancelAll();
            $uploadRows.empty();
            log('******');
            log("All uploads canceled :(");
        });

        // Previews generating switcher
        $previewsChecker.on('change', function() {
            previewsOn = $previewsChecker.prop('checked');
        });

        // Adding from canvas
        $canvasAddBtn.on('click', function() {
            $fileInput.duEnqueue(canvas.toDataURL('image/png'));
        });

        // Adding from textarea
        $textAddBtn.on('click', function() {
            $fileInput.duEnqueue($('#text-to-send').val());
        });

        // Form submit
        $uploadForm.on('submit', function(e) {
            e.preventDefault();
            $fileInput.duStart();
        });

    });

})(window.jQuery);


// File API support info
if(!$.support.fileSelecting) {
    log("[-] Your browser doesn't support File API (uploads may be performed only by default form sending)");
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
