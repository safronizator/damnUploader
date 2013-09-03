<?php
/*
 * Handler for ajax requests (modern browsers with HTML5 file API) will post here
 */

header('Content-Type: application/json; charset=utf-8');

// For error handling tests :)
/*
if(rand(1, 4) == 4) {
    $status = '500 Internal Server Error';
    header("HTTP/1.1 {$status}");
    header("Status: {$status}");
    die();
}
*/

if(!empty($_FILES) && !empty($_FILES['my-file'])) {

    $fileMeta = $_FILES['my-file']; // Key was defined in 'fieldName' option
    if ($fileMeta['type'] == 'image/png') {
        // Do something with received file
    }

    // Sending JSON-encoded response
    echo json_encode(array(
        'file' => $fileMeta,
        'post' => $_POST
    ));
} else {
    echo json_encode(array('error' => 'Wrong request!'));
}
?>
