// Shorthand log function
window.log = function(data) {
    window.console && window.console.log && window.console.log(data);
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
    });

})(window.jQuery);
