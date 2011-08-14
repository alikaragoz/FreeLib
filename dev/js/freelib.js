var freelib = (function() {
	
	// Scroller
	var myScroll;
	
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

	// Maximum distance for geoloc : 0.5km
	var dist = 0.5;
	
	// Position watcher
	var geoWatch;
	
	// Current position of the user
	var curLatitude;
	var curLongitude;
	
	// Initialisation function
	function init () {
		
		// Init of the scroller
		setTimeout(function () {
			myScroll = new iScroll('wrapper');
		}, 100);
		
		// For more accurate positionning 
		geoWatcher();
		
		// We check if the database already exists
		initDb();
	}
 	
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

    // Database reset
    function resetDB() {
        if (window.openDatabase) {
            db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS map', [],
                function() {});
            });
        }
		else {
            console.log('Web Databases not supported');
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
		// We do it in the complete because we have to make sure we have received the data
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
			if (db) {
            	db.transaction(function(tx) {
	                var i = 0
	                $(map).each(function() {
	                    tx.executeSql('INSERT INTO map (id, address, bonus, fullAddress, lat, lng, name, number, open) values (?, ?, ?, ?, ?, ?, ?, ?, ?)', [i, this.address, this.bonus, this.fullAddress, this.lat, this.lng, this.name, this.number, this.open]);
	                    i++;
	                });
	            });
	        }
			else {
				console.log('error occurred trying to open DB');
			}
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
	
	function geoWatcher() {
		if (navigator.geolocation) {
			geoWatch = navigator.geolocation.watchPosition(function(position){
				curLatitude = position.coords.latitude;
				curLongitude = position.coords.longitude;
			},
			// next function is the error callback
			function (error) {
				switch(error.code) {
					case error.TIMEOUT:
						alert ('Timeout');
						break;
					case error.POSITION_UNAVAILABLE:
						alert ('Position unavailable');
						break;
					case error.PERMISSION_DENIED:
						alert ('Permission denied');
						break;
					case error.UNKNOWN_ERROR:
						alert ('Unknown error');
						break;
				}
			},
			{timeout:27000, maximumAge: 30000, enableHighAccuracy:true}
			);
		}
	}
	
	function geolocate() {
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(geoWatch);
			navigator.geolocation.getCurrentPosition(
			function (position) {
				var currentPosition = new LatLon(position.coords.latitude, position.coords.longitude);
				searchPosition(currentPosition); 
			}, 
			// next function is the error callback
			function (error) {
				switch(error.code) {
					case error.TIMEOUT:
						alert ('Timeout');
						break;
					case error.POSITION_UNAVAILABLE:
						alert ('Position unavailable');
						break;
					case error.PERMISSION_DENIED:
						alert ('Permission denied');
						break;
					case error.UNKNOWN_ERROR:
						alert ('Unknown error');
						break;
				}
			},	
			{timeout:27000, maximumAge: 30000, enableHighAccuracy:true}
			);
		}
		else {
			alert("La geolocalisation ne semble pas être supportée par votre navigateur");
		}
		
		function searchPosition (currentPosition) {
			if (window.openDatabase) {
				db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
	            db.transaction(function(tx) {
					// Selecting all the row of the map table
	                tx.executeSql('SELECT * FROM map', [],
	                function(tx, results) {
	                    if(results.rows && results.rows.length) {
							// Our flag to know if there are available stations
							var	stationsAround = 0;
							
							// The array witch will be transmitted to the getStationStatus function which retrives the stations status.
							var stations = new Array();
							
							// We go through all the stations
	                        for (i = 0; i < results.rows.length; i++) {
								// Getting the position of the GPS
								var stationPosition = new LatLon(results.rows.item(i)['lat'], results.rows.item(i)['lng']);
								
								// If the station is in a permieter of 500m we keep it
								if (currentPosition.distanceTo(stationPosition) <= dist) {
									stationsAround++;
									
									// We fill the unsorted array
									stations.push([currentPosition.distanceTo(stationPosition),results.rows.item(i)]);
								};			
	                        }
							// TODO : faire le style + <li> diff
							if (stationsAround == 0) {
								 $("#scroller").text("Aucune station à moins de 500m");
							}
							else {
								// We sor the stations by the closest first
								stations.sort();
								
								// Adding the elements in the list
								$.each(stations, function() {
									$("#scroller").append($('<li id="' + this[1]['number'] + '"><div class="location"><div class="adresse"><span id="velib_id">à ' + Math.round(this[0]*1000) + 'm</span>' + this[1]['fullAddress'] + '</div></div><div class="velib_status"><div class="velib_num"><div class="sign"></div><div class="flip"><div class="num1">?</div></div></div><div class="parks_num"><div class="sign">P</div><div class="flip"><div class="num2">?</div></div></div></div><div class="clr"></div></li>'));
								});
								
								// Refreh the scroller with the new elements
								myScroll.refresh();
								
								// Asynchronous update of the stations status
								getStationsStatus(stations.sort());
							}
	                    }
						else {
		                    console.log('error occurred trying to open DB');
		                }
	                });
	            });
			} else {
				 console.log('Web Databases not supported');
			}
		}
	}
	
	function getStationsStatus(stations) {
		$.each(stations, function() {
			// Station element.
			var station = this[1];
			
			// We build the YQL URL to fetch the status on velib's service
 			var stationURL = yqlURL + encodeURIComponent(yqlStatement) + encodeURIComponent(velibServiceURL + '/' + stationStatusArgument + '/' + station['number']) + yqlCallBack;
 			$.getJSON(
	 			stationURL,
	 			function(data) {
					var available = data.query.results.station.available;
					var free = data.query.results.station.free;
					$('#' + station['number'] + ' .num1').text(available);
					$('#' + station['number'] + ' .num2').text(free);
				})
	 			.error(function(){
	 				console.log('Error while get the station status.');
	 			});
		});
	}
	
    return {
		init: init,
        reset: resetDB,
        getMap: getMap,
        searchStation: searchStation,
		geolocate: geolocate,
		getStationsStatus: getStationsStatus
    };
})();