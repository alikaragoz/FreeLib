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

	// Maximum distance for geoloc : 0.5km
	var dist = 0.5;
	
	// Position watcher
	var geoWatch;
	
	// Current position of the user
	var curLatitude;
	var curLongitude;
	
	// Initialisation function
	function init () {
		// We check if the database already exists
		initDb();
		checkMapUpdate();
		updateFavoriteStations();
		searchStationNear();
	}
 	
	// Database initialisation
    function initDb() {
        try {
            if (window.openDatabase) {
                db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
                if (db) {
					db.transaction(function(tx) {
						tx.executeSql("CREATE TABLE IF NOT EXISTS prefs (id REAL UNIQUE, favoris LONGTEXT, lastVisit DATE)", [], function() {});
					});
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
                tx.executeSql('DROP TABLE IF EXISTS map', [], function() {});
				//TODO : Ne pas reset les preferences!
				//tx.executeSql('DROP TABLE IF EXISTS prefs', [], function() {});
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
	
	function checkMapUpdate() {
		db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM prefs', [],
            function(tx, results) {

				if(results.rows && !results.rows.length) {
					updateLastVisit();
					getMap();
                }
				else {
					
					var currentTime = new Date();
					var month = currentTime.getMonth() + 1;
					var day = currentTime.getDate();
					var year = currentTime.getFullYear();
					
					lastTime = results.rows.item(0)['lastVisit'];
					//lastTime = '08/01/2011';
					
					var thisTime = month + '/' + day + '/' + year;
					
					// We retirve the number of days since last visit
					var numDays = (Date.parse(thisTime) - Date.parse(lastTime)) / 1000 / 3600 / 24;
					
					// We check every week for new station
					if (numDays >= 7) { 
						resetDB();
						initDb();
						updateLastVisit();
						getMap();
					};
					
				}	
            });
        });
	}
	
	function updateLastVisit() {
		var currentTime = new Date();
		var month = currentTime.getMonth() + 1;
		var day = currentTime.getDate();
		var year = currentTime.getFullYear();
		
		var thisTime = month + '/' + day + '/' + year;
		
		db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
        db.transaction(function(tx) {
			tx.executeSql('INSERT INTO prefs (id, favoris, lastVisit) values (?, ?, ?)', [1, '', thisTime], function(){});
		});
	}
	
    function searchStationNear() {
        $("#search").bind('keypress', 
		function(e) {
			if(e.keyCode == 13) {
				// Stopping the position watcher
				if (navigator.geolocation) {
					navigator.geolocation.clearWatch(geoWatch);
				}
				else{
					console.log('Browser not supported.');
				}
				search(e);
			}
		});

        function search(event) {
            if($("#search").val().length > 0) {
				searchLocation($("#search").val());
			}
			else {
				$("#search_results").text("Pas de résultat");
			}
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
						alert ('Delai dépassé');
						break;
					case error.POSITION_UNAVAILABLE:
						alert ('Position non disponible');
						break;
					case error.PERMISSION_DENIED:
						alert ('Permission non accordée');
						break;
					case error.UNKNOWN_ERROR:
						alert ('Erreur inconnue');
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
						alert('Delai dépassé');
						break;
					case error.POSITION_UNAVAILABLE:
						alert('Position non disponible');
						break;
					case error.PERMISSION_DENIED:
						alert('Permission non accordée');
						break;
					case error.UNKNOWN_ERROR:
						alert('Erreur inconnuer');
						break;
				}
			},	
			{timeout:27000, maximumAge: 30000, enableHighAccuracy:true}
			);
		}
		else {
			alert("La geolocalisation ne semble pas être supportée par votre navigateur");
		}
	}
	
	function searchPosition (point) {
		if (window.openDatabase) {
			db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
            db.transaction(function(tx) {
				// Selecting all the row of the map table
                tx.executeSql('SELECT * FROM map', [],
                function(tx, results) {
                    if(results.rows && results.rows.length) {
	
						$("#search-wrapper #scroller").text('');
						
						// Our flag to know if there are available stations
						var	stationsAround = 0;
						
						// The array witch will be transmitted to the getStationStatus function which retrives the stations status.
						var stations = new Array();
						
						// We go through all the stations
                        for (i = 0; i < results.rows.length; i++) {
							// Getting the position of the GPS
							var stationPosition = new LatLon(results.rows.item(i)['lat'], results.rows.item(i)['lng']);
							
							// If the station is in a permieter of 500m we keep it
							if (point.distanceTo(stationPosition) <= dist) {
								stationsAround++;
								
								// We fill the unsorted array
								stations.push([point.distanceTo(stationPosition),results.rows.item(i)]);
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
								
								// We are usinge escape to avoid single quotes problems
								$("#search-wrapper #scroller").append('<li class="' + this[1]['number'] + '"><div class="location"><div class="adresse"><span id="velib_id">à ' + Math.round(this[0]*1000) + 'm</span>' + this[1]['fullAddress'] + '</div></div><div class="velib_status"><div class="velib_num"><div class="sign1"></div><div class="flip"><div class="num1">?</div></div></div><div class="parks_num"><div class="sign2">P</div><div class="flip"><div class="num2">?</div></div></div></div><div class="clr"></div><div class="add" onclick="freelib.addStation(' + this[1]['number'] + ',\'' + escape(this[1]['fullAddress']) +'\');"></div></li>');
								// Refreh the scroller with the new elements
								searchScroll.refresh();
							});
							
							// Refreh the scroller with the new elements
							searchScroll.refresh();
							
							// Asynchronous update of the stations status
							getStationsStatus(stations.sort());
							
							// We continue to look for the users position
							geoWatcher();
						}
                    }
					else {
	                    console.log('No results found. Database empty?');
	                }
                });
            });
		} else {
			 console.log('Web Databases not supported');
		}
	}
	
	function searchLocation (address) {
		geocoder = new google.maps.Geocoder();
		geocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				var adressPosition = new LatLon(results[0].geometry.location.lat(), results[0].geometry.location.lng());
				searchPosition(adressPosition);
			} else {
				alert("Erreur lors de la recherche: " + status);
			}
		});
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
					
					if (available >= 5) { 
						$('.' + station['number'] + ' .sign1').addClass('green');
					}                                                         
					else {                                                    
						 $('.' + station['number'] + ' .sign1').addClass('red');
					}                                                         
					                                                          
					if (free >= 5) {                                          
						$('.' + station['number'] + ' .sign2').addClass('green'); 
					}                                                         
					else {                                                    
						$('.' + station['number'] + ' .sign2').addClass('red'); 
					}
					
					$('.' + station['number'] + ' .num1').text(available);
					$('.' + station['number'] + ' .num2').text(free);
				})
	 			.error(function(){
	 				console.log('Error while getting the station status.');
	 			});
		});
	}
	// TODO : see animation with css instead.
	function showView (view) {
		if (view == 'favs') {
			showFavs();
		};
		if (view == 'search') {
			showSearch();
		}
		if (view == 'info') {
			showInfo();
		};
	}
	
	function showFavs() {
		// Stopping the position watcher
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(geoWatch);
		}
		else{
			console.log('Browser not supported.');
		}
		
		$("#fav-wrapper").css({'z-index': '2'});
		$("#search_box_bg").css({'z-index': '1', 'display': 'none'});			
		$("#middle").css({'top': '51px'});
		$("#cursor").css({'margin-left': '5px'});
		
	}
	
	function showSearch() {
		// For more accurate positionning 
		geoWatcher();
		
		$("#search-wrapper").css({'z-index': '2'});
		$("#search_box_bg").css({'z-index': '3', 'display': 'block'});
		$("#middle").css({'top': -($(window).height()-205) + 'px'});
		$("#cursor").css({'margin-left': '85px'});
				
	}
	
	function showInfo() {
		// Stopping the position watcher
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(geoWatch);
		}
		else {
			console.log('Browser not supported.');
		}
		
		$("#info-wrapper").css({'z-index': '2'});
		$("#middle").css({'top': -($(window).height()-152)*2 + 'px'});
		$("#cursor").css({'margin-left': '165px'});
	}
	
	function addStation (stationNum, fullAdress) {
		var ajouter=confirm('Ajouter la station ' + stationNum + ' à vos favoris?');
		if (ajouter == true) {
			if(updateFavoritesDb(stationNum, 'add') == true) {
				addStationInDom(stationNum, unescape(fullAdress));
				updateFavoriteStation(stationNum);
			}
		}
	}
	
	function updateFavoritesDb (stationNum, action) {
		var favoris;
		db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
        db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM prefs', [], function(tx, results) {
				if(results.rows && results.rows.length) {
					if (results.rows.item(0)['favoris'].search(stationNum) == -1  || action == 'remove') {
						switch(action) {
							case 'add':
								favoris = (results.rows.item(0)['favoris'] == '' ? stationNum.toString() : results.rows.item(0)['favoris'] + ',' + stationNum);
								break;
							case 'remove':
								if (results.rows.item(0)['favoris'].split(',').length - 1 > 0) {
									$.each(results.rows.item(0)['favoris'].split(','), function() {
										if (this != stationNum) {
											favoris = (favoris == null ? '': favoris + ',') + this;
										};
									});
								}
								else{
									favoris = '';
								}
								break;
						}
						
						db.transaction(function(tx) {
							tx.executeSql('UPDATE prefs SET favoris=? WHERE id=1', [favoris], function(){
								if(action == 'add') {
									showFavs();
								}
							});
						});
					}
					else if (action == 'add') {
						alert('Cette station est déjà dans vos favoris');
						return false;
					}
				}
			});
		});
		return true;
	}
	
	function addStationInDom (stationId, fullAddress) {
		$("#fav-wrapper #scroller").append($('<li class="' + stationId + '"><div id="station_top" onclick="freelib.showOptions(' + stationId + ');"><div class="location"><div class="adresse"><span id="velib_id">' + stationId + '</span>' + fullAddress + '</div></div><div class="velib_status"><div class="velib_num"><div class="sign1"></div><div class="flip"><div class="num1">?</div></div></div><div class="parks_num"><div class="sign2">P</div><div class="flip"><div class="num2">?</div></div></div></div><div class="clr"></div></div><div class="options"><div id="opt_refresh" onclick="freelib.refresh(' + stationId + ');"></div><div id="opt_del" onclick="freelib.remove(' + stationId + ');"></div><div id="opt_up" onclick="freelib.up(' + stationId + ');"></div><div id="opt_down" onclick="freelib.down(' + stationId + ');"></div></li>'));
	}
	
	function updateFavoriteStations () {
		$("#fav-wrapper #scroller").html('');
		db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
        db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM prefs', [], function(tx, results) {
				if(results.rows && results.rows.length) {
					$.each(results.rows.item(0)['favoris'].split(','), function() {
						var stationItem = this
						db = openDatabase("Freelib", "1.0", "Votre velib dans la poche", 512000);
			            db.transaction(function(tx) {
							// Selecting all the row of the map table
			                tx.executeSql('SELECT * FROM map WHERE number=?', [stationItem], function(tx, results) {
									if(results.rows && results.rows.length) {
										// We fill the list
										addStationInDom (results.rows.item(0)['number'], results.rows.item(0)['fullAddress']);
										
										// Refreh the scroller with the new elements
										setTimeout(function () {
											favScroll.refresh();
										}, 200);					
										
										// Asynchronous update of the stations status
										var stationToUpdate = new Array();
										stationToUpdate.push([0,results.rows.item(0)])
										getStationsStatus(stationToUpdate);															
									}									
									else {
										$("#content").text('Aucune station favorite');
										$("#content").show();
									}
							});
						});
					});
				}
				else {
					$("#content").text('Aucune station favorite');
					$("#content").show();
				}
			});
		});
	}
	
	function updateFavoriteStation (station) {
		
		// Clearing the actual status of the station.
		$('#fav-wrapper .' + station + ' .num1').text('?');
		$('#fav-wrapper .' + station + ' .num2').text('?');
		
		// Updating the station station.
		var stationToUpdate = new Array();
		stationToUpdate.push([0,{'number': station}]);
		getStationsStatus(stationToUpdate);
	}
	
	function showOptions(station) {
		$.each($('#fav-wrapper li'), function() {
			if ($(this).height() == 160) {
				$('#fav-wrapper li').css({'height' : '90px'});
				$('.' + station + '.options').css({'display' : 'none'});
			};
		})
		
		if ($('.' + station + ' .options').css('display') == 'block') {
			$('#fav-wrapper .' + station).css({'height' : '90px'});
			$('.' + station + ' .options').css({'display' : 'none'})
			
		} else {
			$('#fav-wrapper .' + station).css({'height' : '160px'});
			$('.' + station + ' .options').css({'display' : 'block'});
		}
		favScroll.refresh();
	}
	
	function refresh (station) {
		updateFavoriteStation(station);
	}
		
	function remove (station) {
		var remove=confirm('Êtes-vous sûr de vouloir supprimer la station ' + station + ' de vos favoris?');
		if (remove==true) {
			updateFavoritesDb(station, 'remove');
			
			// remove the element from the DOM
			$('#fav-wrapper .' + station).remove();
		}
	}
	function up (station) {
		console.log('up World!');
	}
	function down (station) {
		console.log('down World!');
	}
	
    return {
		init: init,
        reset: resetDB,
        getMap: getMap,
		geolocate: geolocate,
		getStationsStatus: getStationsStatus,
		showView: showView,
		addStation: addStation,
		showOptions: showOptions,
		refresh: refresh,
		remove: remove,
		up: up,
		down: down
    };
})();