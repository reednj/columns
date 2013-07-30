<?php

require_once 'lib/esql.inc.php';

Class Cells {
	static function Insert($fields) {
		return ESQL::Insert('cell', $fields);
	}

}


?>