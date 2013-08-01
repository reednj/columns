<?php

require_once 'lib/esql.inc.php';

Class Cells {
	static function Insert($fields) {
		return ESQL::Insert('cell', $fields);
	}

	static function Get($sx, $sy, $ex, $ey) {
		$sx = ESQL::Escape($sx);
		$sy = ESQL::Escape($sy);
		$ex = ESQL::Escape($ex);
		$ey = ESQL::Escape($ey);

		return ESQL::Select('cell', array(
			'column_list' => array('x', 'y', 'color'),
			'where' => "x >= '$sx' && y >= '$sy' && x < '$ex' && y < '$ey'",
			'limit' => '20000'
		));
	}

}


?>