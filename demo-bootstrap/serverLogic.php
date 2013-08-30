<?php

header('Content-Type: application/json; charset=utf-8');

/*
if(rand(1, 4) == 4) {
    // Имитируем ошибку каждый четвертый раз
    $status = '404 Not Found';
    header("HTTP/1.1 {$status}");
    header("Status: {$status}");
    die();
}
*/

if(!empty($_FILES)) {
    // Файл передан через обычный массив $_FILES
    //echo 'Contents of $_FILES:<br/><pre>'.print_r($_FILES, true).'</pre>';
    $fileMeta = $_FILES['my-pic'];
    // Внимание! Имя файла для Blob-данных может различаться в разных браузерах
    if ( ($fileMeta['type'] == 'image/png') && ($fileMeta['name'] == 'blob') ) {
        //move_uploaded_file($fileMeta['tmp_name'], './canvas-' . uniqid() . '.png');
    }
    echo json_encode(array(
        'file' => $fileMeta,
        'post' => $_POST
    ));
} else {
    // Надо выцеплять файл из входного потока php
    // (такое встречается только в очень экзотических браузерах,
    //  поэтому можно не предусматривать этот способ вовсе)
    $headers = getallheaders();
    if(array_key_exists('Upload-Filename', $headers)) {
        //$data = file_get_contents('php://input');
        echo json_encode(array(
            'name' => $headers['Upload-Filename'],
            'size' => $headers['Upload-Size'],
            'type' => $headers['Upload-Type']
        ));
    }
}
?>
