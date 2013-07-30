<?php
require_once 'lib/db.php';

if(isset($_GET['sx']) && isset($_GET['sy']) && isset($_GET['ex']) && isset($_GET['ey'])) {
	$data = Cells::Get($_GET['sx'], $_GET['sy'], $_GET['ex'], $_GET['ey']);

	for($i=0; $i < sizeof($data); $i++) {
		$data[$i]['x'] = intval($data[$i]['x']);
		$data[$i]['y'] = intval($data[$i]['y']);
	}

	$result = array('result' => 'ok', 'data' => $data);
} else {
	$result = array('result' => 'error', 'message' => 'bad args');
}

print json_encode($result);

?>