var freelib = (function() {
	// YQL variables
	var yqlURL = "http://query.yahooapis.com/v1/public/yql?q=";
	var yqlStatement = "select * from xml where url='";
	var yqlCallBack = "'&format=json&callback=?";
	
	// Velib service variables
	var velibServiceURL = "http://www.velib.paris.fr/service";
	var mapArgument = 'carto';
	var stationStatusArgument = 'stationdetails';
	
	// Database initialisation
	function initDb() {
		try {
			if (window.openDatabase) {
				db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
				if (db) {
					db.transaction(function(tx) {
						tx.executeSql("CREATE TABLE IF NOT EXISTS map (id REAL UNIQUE, address TEXT, bonus INT, fullAddress TEXT, lat FLOAT, lng FLOAT, name TEXT, number INT, open INT)", [], function (tx, result) {});
					});
				} else {
					console.log('error occurred trying to open DB');
				}
			} else {
				console.log('Web Databases not supported');
			}
		} catch (e) {
			console.log('error occurred during DB init, Web Database supported?');
		}
	}
	
	//TODO : Finir la fonction loadMap
	function loadMap () {
		
		var yqlStatement = "select * from xml where url='";
		var mapURL = yqlURL + encodeURIComponent(yqlStatement) + encodeURIComponent(velibServiceURL) + '/' + mapArgument + yqlCallBack;
		$.getJSON(
			mapURL,
			function(data) {
				//var available = data.query.results.station.available;
				//console.log(data);
		})
		.error(function(){
			console.log('An error occurred	while parsing the maps data');
		});
	}
	
	return {
    init: initDb,
    loadMap: loadMap
    };
})();