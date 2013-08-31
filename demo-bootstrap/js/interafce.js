// Shorthand log function
window.log = function() {
    window.console && window.console.log && window.console.log.apply(window.console, arguments);
};

(function($) {

    $(function() {

        // Tooltips ;-)
        var $tooltiped = $('.auto-tip');
        var hideTips = function() { $tooltiped.tooltip('hide'); };
        $tooltiped.tooltip({
            trigger: 'manual',
            container: 'body'
        }).tooltip('show');
        $(window).on('resize click', hideTips);

        // Drag & drop events handling
        var $dropBox = $("#drop-box");
        var $uploadForm = $("#upload-form");
        var exitedToForm = false;
        var highlighted = false;
        var highlight = function(mode) {
            mode ? $dropBox.addClass('highlighted') : $dropBox.removeClass('highlighted');
        };
        $dropBox.on({
            dragenter: function() {
                highlight(true);
            },
            dragover: function() {
                highlighted || highlight(true);
                return false; // To prevent default action
            },
            dragleave: function() {
                setTimeout(function() {
                    exitedToForm || highlight(false);
                }, 50);
            },
            drop: function() {
                highlight(false);
            }
        });
        $uploadForm.on({
            dragenter: function() {
                exitedToForm = true;
                highlighted || highlight(true);
            },
            dragleave: function() {
                exitedToForm = false;
            }
        });

        // Canvas filling
        var canvas = document.getElementById('canvas');
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgb(128,128,128)";
        ctx.fillRect (0, 0, 150, 150);
        ctx.fillStyle = "rgb(200,0,0)";
        ctx.fillRect (10, 10, 55, 50);
        ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
        ctx.fillRect (30, 30, 55, 50);

    });

})(window.jQuery);
