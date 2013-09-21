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
### Methods

**duStart()** - Start queued files uploading

If you prefer start upload immediately after file added, you doesn't need to call this method, 
you can call UploadItem.start() instead (see desc. below), for example, when 'du.add' event fired.

**duCancel(queueId)** - Cancel upload by it id

We recommend to use UploadItem.cancel() method instead (see desc. below)

**duCancelAll()** - Cancel all queued files uploading and clear queue. Active uploads will be canceled too

**duEnqueue(item)** - Adds some data (it may not be a File object necessarily, see duNewUploadItem() method desc.)
to upload queue

Use this method, if you want to add custom data to upload as file. 
Method can interpret not only File or File-compatible objects. 
In case of given argument is not File-compatible, will attempt to convert it 
into such, according to the rules described in duNewUploadItem() method description (see below).

**duGetQueue(item)** - Returns all queued items in hash like {uploadID: uploadItemObject}

**duCount()** - Returns count of queued items

**duOption(name, value)** - Change some option value

'url', 'mutliple', 'fieldName', 'limit', 'dataType' are changeable

**duNewUploadItem(fileOrData)** - Creates UploadItem object from some data, according to the following rules:

* if arg is already instance of UploadItem, it will be returned as is
* if arg is File-compatible object (window.File and window.Blob are), creates UploadItem with data & type contained inside it
* if arg is dataURI, parses it and creates UploadItem with defined data & type
* in other cases tries to call toString() method and create blob with type 'text/plain', then creates UploadItem from it

UploadItem object, created by this method may be customized and then added to upload queue or uploaded instantly by
calling it upload() method. duGetQueue() calls this method() independently, if needed.

### Events | @todo: descriptions

Events handlers may be attached by jQuery event API methods:
```javascript
$fileInput.on('du.limit', function() { alert('Uploads limit exceeded!'); });
```

**du.add**

**du.limit**

**du.completed**


