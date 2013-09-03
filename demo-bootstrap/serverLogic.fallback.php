<?php
/*
 * Fallback handler (archaic browsers with no File API will send requests here by default form submitting)
 */

if(!empty($_FILES) && !empty($_FILES['my-file'])) {

    $fileMeta = $_FILES['my-file']; // Key was defined in 'fieldName' option
    if ($fileMeta['type'] == 'image/png') {
        // Do something with received file
    }

    echo "File received:<hr/>";
    echo '<pre>';
    print_r($fileMeta);
    echo '</pre><hr/>';
    echo '<a href="./">Back to demo</a>'; // in real case redirect after processing is appropriate here
} else {
    echo "Wrong request";
}
?>
