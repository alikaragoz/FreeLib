<?php
if (is_numeric($_GET['get']) || $_GET['get'] == 'map')  {
	$url = (is_numeric($_GET["get"]) ? 'http://www.velib.paris.fr/service/stationdetails/'.$_GET["get"] : "http://www.velib.paris.fr/service/carto/");
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	$output = curl_exec($ch);
	curl_close($ch);
	echo json_encode(simplexml_load_string($output));
} else {
	echo "petit coquin ;)";
}

?>