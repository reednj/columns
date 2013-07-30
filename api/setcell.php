<?php
require_once 'lib/db.php';

if(isset($_GET['x']) && isset($_GET['y']) && isset($_GET['color'])) {
	$fields = array(
		'x' => $_GET['x'],
		'y' => $_GET['y'],
		'color' => $_GET['color']
	);

	Cells::Insert($fields);

	$result = array('result' => 'ok');
} else {
	$result = array('result' => 'error', 'message' => 'bad args');
}

print json_encode($result);

?>