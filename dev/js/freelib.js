var freelib = (function() {

    // Global variables
    var map = new Array();
    var db = null;

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
                        tx.executeSql("CREATE TABLE IF NOT EXISTS map (id REAL UNIQUE, address TEXT, bonus INT, fullAddress TEXT, lat FLOAT, lng FLOAT, name TEXT, number INT, open INT)", [],
                        function(tx, result) {});
                    });
                } else {
                    console.log('error occurred trying to open DB');
                }
            } else {
                console.log('Web Databases not supported');
            }
        } catch(e) {
            console.log('error occurred during DB init, Web Database supported?');
        }
    }

    // TODO : do some tests.
    // Database reset
    function resetDB() {
        if (window.openDatabase) {
            db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS map', [],
                function() {});
            });
        }
    }

    // We retrive the map array from the xml
    function getMap() {
        // We build the YQL URL to fetch the map on velib's service
        var mapURL = yqlURL + encodeURIComponent(yqlStatement) + encodeURIComponent(velibServiceURL) + '/' + mapArgument + yqlCallBack;
        var xml = new Array();
        $.getJSON(
        mapURL,
        function(data) {
            xml = data
        })
        .complete(function() {
            populateMapDB(xml.query.results.carto.markers.marker);
        })
        .error(function() {
            console.log('An error occurred	while parsing the maps data');
        });
    }

    // We fill the database with the list of all the stations
    function populateMapDB(map) {
        // If the map is not empty
        if (map != null) {
            db.transaction(function(tx) {
                var i = 0
                $(map).each(function() {
                    tx.executeSql('INSERT INTO map (id, address, bonus, fullAddress, lat, lng, name, number, open) values (?, ?, ?, ?, ?, ?, ?, ?, ?)', [i, this.address, this.bonus, this.fullAddress, this.lat, this.lng, this.name, this.number, this.open]);
                    i++;
                });
            });
        }
        else {
            console.log('An error occurred while loading the map');
        }
    }

    function searchStation() {
        $("#search").keyup(function(e) {
            search(e);
        }).bind("paste",
        function(e) {
            setTimeout(function() {
                search(e);
            },
            100);
        }).bind('keypress', 
		function(e) {
			if(e.keyCode == 13) {
				search(e);
			}
		});

        function search(event) {
            if($("#search").val().length > 0) {
				dbQuery($("#search").val());
			}
			else {
				$("#search_results").text("Pas de résultat");
			}
        }
		
		function dbQuery(string) {
			db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
            db.transaction(function(tx) {
                tx.executeSql('SELECT * FROM map WHERE fullAddress LIKE "%' + string + '%" OR number LIKE "%' + string + '%"', [],
                function(tx, results) {
                    if(results.rows && results.rows.length) {
                        $("#search_results").text("");
                        for (i = 0; i < results.rows.length; i++) {
                            $("#search_results").append('<li>' + results.rows.item(i)['fullAddress'] + '</li>');
                        }
                    }
                    else{
                        $("#search_results").text("");
                    }
                });
            });
		} 
    }

    return {
        init: initDb,
        reset: resetDB,
        getMap: getMap,
        populateMapDB: populateMapDB,
        searchStation: searchStation
    };
})();