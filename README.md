damnUploader
============

jQuery file upload plugin. Simplifies AJAX files uploading and client-side file management routines.

### Features:

* works through HTML5 File API in modern browsers
* has built-in feature detection, that gives ability to realize graceful degradation in older browsers
* drag & drop
* multiple files selecting
* base MIME type checking
* file reading
* creating uploads from custom data


Demo
----

Complex, well commented demo available in [./demo-bootstrap](./demo-bootstrap/).
Also, you can [view it online](http://safron.su/playground/damnUploader/demo-bootstrap/).
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
### Init parameters

**url**: URL to upload (default: **'/upload.php'**). Every upload will be performed in a separate request.

**multiple**: allows to select several files (default: **true**)

**fieldName**: sets file field name. For ex., it will be used as index in $_FILES when upload handled by PHP. (default: **'file'**)

**dropping**: switch on drag&drop functionality (default: **true**)

**dropBox**: container for drag&drop. You may pass selector or jQuery chained object (default: **false**)

**limit**: used to limit count of files to put in queue (default: **false**, means no limit)

**dataType**: expected response type, 'text' or 'json' (default: **'text'**)

**method**: HTTP method, 'POST' or 'PUT' (default: **'POST'**)

**acceptType**: accepted MIME type (for example: 'image/\*' or 'image/png'; default: **null** - accept all)


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

**duGetQueue()** - Returns all queued items in hash like {uploadID: uploadItemObject}

**duCount()** - Returns count of queued items

**duOption(name, value)** - Change some option value

'url', 'fieldName', 'limit', 'dataType', 'method' are changeable

**duNewUploadItem(fileOrData)** - Creates UploadItem object from some data, according to the following rules:

* if arg is already instance of UploadItem, it will be returned as is
* if arg is File-compatible object (window.File and window.Blob are), creates UploadItem with data & type contained inside it
* if arg is dataURI, parses it and creates UploadItem with defined data & type
* in other cases tries to call toString() method and create blob with type 'text/plain', then creates UploadItem from it

UploadItem object, created by this method may be customized and then added to upload queue or uploaded instantly by
calling it upload() method. duEnqueue() calls this method independently, if needed.

**duIsAcceptedType(mime)** - Check that passed MIME type string matches defined in 'acceptType' property


### Events

Events handlers may be attached by jQuery event API methods:
```javascript
$fileInput.on('du.add', function(e) { console.log('File added: ' + e.uploadItem.file.name); });
```

**du.add** - fired when file is selected

In case of multiple files were selected, triggers separately for each file. UploadItem object can be accessed from
event object (it has property uploadItem). You can reject file by calling event.preventDefault(). If you want to
start uploads immediately, you could cancel default action (enqueueing file) by event.preventDefault() and start
upload by calling event.uploadItem.upload()

**du.limit** - fired when count of files exceeded defined limit, but user tries to add more files

**du.completed** - fired once when all uploads completed

Every UploadItem object has own complete callback (see UploadItem desc.)


### UploadItem object

Special object, that represents single item to upload (it may not necessarily be a real file).

**Fields**:

**file** - contains window.File object if assigned

**fieldName** - upload field name

**replaceName** - name to replace original file name

**progressCallback** - function to call on upload progress is updated. Current progress state (in percents) passed as argument

**completeCallback** - function to call when upload completed. Passed arguments: successFlag, recievedData, httpStatusCode.
Example:
```javascript
$fileInput.on('du.add', function(e) {
    console.log('File added: ' + e.uploadItem.file.name);
    e.uploadItem.completeCallback = function(succ, data, status) {
        console.log(this.file.name + " was uploaded. Recieved data: ", data)
    };
});
```


**Methods**:

**id()** - returns unique item id

**addPostData(data)** - adds some data to post with upload (multiple fields as plain object)
```javascript
e.uploadItem.addPostData({ hello: 'world' });
```
**addPostData(name, value)** - adds some data to post with upload (single field)
```javascript
e.uploadItem.addPostData('hello', 'world');
```

**upload()** - start upload. You not need to call this method when duStart() method is used

**cancel()** - cancel upload and remove item from queue

**readAs(format, callback)** - read file as defined format and pass data to callback. Possible formats are:
'Text', 'DataURL', 'BinaryString', 'ArrayBuffer'. Example:
```javascript
e.uploadItem.readAs('Text', function(data) {
    console.log("file contents:", data);
});
```


### Feature detection

Plugin adds several flags to **$.support** object:

**fileSelecting** - *false* if there's no way to handle file selection, and thus to control uploading

**fileReading** - *false* if there's no possibility to read files (method readAs() will always return null)

**uploadControl** - *false* if can't retrieve progress data. UploadItem's progressCallback will be called once with value of 100%

**fileSending** - *false* if browser doesn't support file API

Example:
```javascript
$('#form-with-files').submit(function(e) {
    if ($.support.fileSending) {
        // if browser supports, start uploading by plugin
        $fileInput.duStart();
        e.preventDefault();
    }
    // else - form will be sended on default handler, defined in it's "action" attribute
});
```


Browser support
---------------

Supported in all modern browsers that supports file API. See details at [caniuse.com](http://caniuse.com/#feat=fileapi).
