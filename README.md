damnUploader
============

jQuery file upload plugin. Simplifies AJAX files uploading and client-side file management routines.

### Features:

* works through HTML5 File API in modern browsers
* has built-in feature detection, that gives ability to realize graceful degradation in older browsers
* drag & drop
* multiple files selecting
* file reading
* creating uploads from custom data


Demo
----

Complex, well commented demo available in [./demo-bootstrap](./demo-bootstrap/). (@todo: online example).
It based on twitter bootstrap and contains examples for all most useful cases.


Installing & Using
--------------------

Just include plugin code (jquery.damnUploader.js) to your page, after jQuery lib.

In most simple case, you need to init uploader on file input field:
```javascript
var $fileInput = $('#file-input').damnUploader({
    url: '/ajax-file-upload-handler'
});
```
... and call duStart() method in some event handler (for ex., when form is submitted):
```javascript
$('#file-form').submit(function(e) {
    $fileInput.duStart();
    e.preventDefault();
});
```

To explore a wider range of possibilities, see API description and demo.


API
---
### Methods | @todo: descriptions

**duStart()**

**duCancel(queueId)**

**duCancelAll()**

**duEnqueue(item)**

**duGetQueue(item)**

**duCount()**

**duOption(name, value)**

**duNewUploadItem(fileOrData)**


### Events | @todo: descriptions

Events handlers may be attached by jQuery event API methods:
```javascript
$fileInput.on('du.limit', function() { alert('Uploads limit exceeded!'); });
```

**du.add**

**du.limit**

**du.completed**


