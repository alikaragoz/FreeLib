var freelib = (function() {
		
    // Global variables
    var map = new Array();
    var db = null;

	// Maximum distance for geoloc : 0.5km
	var dist = 0.5;
	
	// Position watcher
	var geoWatch;
	
	// Position for geolocation and search
	var position;
	
	// Database parameters
	var databaseName = "Freelib";
	var databaseVersion = "1.0";
	var databaseDesc = "Votre velib dans la poche";
	var databaseMaxSize = 512000;
	
	var section = 'favs';
	var numFavs = 0;
	
	/* 
		Initialisation function 
	*/
	
	function init () {
		// We check if the database already exists
		initDb();
		
		// At startup we update the list of favs
		updateFavoriteStations();
		
		// Check if the map is up to date
		checkMapUpdate();
		
		// Activate the search in the input box
		searchStationNear();
	}

	/* 
		Database initialisation 
	*/	
	
	function initDb() {
		sqlQuery = 'CREATE TABLE IF NOT EXISTS prefs (id REAL UNIQUE, favoris LONGTEXT, lastVisit DATE)';
		dbQuery(sqlQuery);
		
		var sqlQuery = 'CREATE TABLE IF NOT EXISTS map (id REAL UNIQUE, address TEXT, bonus INT, fullAddress TEXT, lat FLOAT, lng FLOAT, name TEXT, number INT, open INT)';		
		dbQuery(sqlQuery);
    }
   
    /*
    	Database reset
    */

	function resetDB()
	{
		var sqlQuery = 'DROP TABLE IF EXISTS map';		
        dbQuery(sqlQuery);
		
		// Erase the user's preferences
		//sqlQuery = 'DROP TABLE IF EXISTS prefs';
		//dbQuery(sqlQuery);
	}

    /*
    	We retrive the map array from the xml
    */
	
	function getMap() {
        var mapURL = 'velib.php/?get=map';
        var xml = new Array();
        $.getJSON(mapURL, function(data) {
            populateMapDB(data.markers.marker);
        });
    }

    /*
    	We fill the database with the list of all the stations.
			
		Note : We do not use the dbQuery because we have to add too many objects at once.
    */

    function populateMapDB(map) {
		// If the map is not empty
		if (map != null) {
			try {
				if (window.openDatabase) {
					db = openDatabase(databaseName, databaseVersion, databaseDesc, databaseMaxSize);
					if (db) {
						db.transaction(function(tx) {
							var i = 0
							$(map).each(function() {
								tx.executeSql('INSERT INTO map (id, address, bonus, fullAddress, lat, lng, name, number, open) values (?, ?, ?, ?, ?, ?, ?, ?, ?)', [i, this['@attributes'].address, this['@attributes'].bonus, this['@attributes'].fullAddress, this['@attributes'].lat, this['@attributes'].lng, this['@attributes'].name, this['@attributes'].number, this['@attributes'].open]);
								i++;
							});
						});
					} else {
						console.log('Error occurred while trying to open the DB');
					};
				} else {
					console.log('Web Databases not supported');
				};
			} catch(e) {
				console.log('Error occurred during DB init, Web Database supported?');
			};
		}
	}
	
	/*
		Check if 7 days passed to download the new map
		
		Concerned functions :
		- checkMapUpdate
		- updateLastVisit
	*/
	
	function checkMapUpdate() {
		var sqlQuery = 'SELECT * FROM prefs';
		
		dbQuery(sqlQuery, undefined, function(tx, rs) {
			if(rs.rows.length == 0) {
				updateLastVisit();
				showSplash('favs');
				getMap();
			} else {
				var currentTime = new Date();
				var month = currentTime.getMonth() + 1;
				var day = currentTime.getDate();
				var year = currentTime.getFullYear();

				lastTime = rs.rows.item(0)['lastVisit'];
				
				//uncomment to reset the map and re-download it
				//lastTime = '08/01/2011';

				var thisTime = month + '/' + day + '/' + year;

				// We retirve the number of days since last visit
				var numDays = (Date.parse(thisTime) - Date.parse(lastTime)) / 1000 / 3600 / 24;

				// We check every week for new stations
				if (numDays >= 7) { 
					resetDB();
					initDb();
					updateLastVisit();
					getMap();
				};			
			}	
		});
	}
		
	function updateLastVisit() {
		var currentTime = new Date();
		var month = currentTime.getMonth() + 1;
		var day = currentTime.getDate();
		var year = currentTime.getFullYear();
		
		var thisTime = month + '/' + day + '/' + year;
			
		var sqlQuery = 'INSERT INTO prefs (id, favoris, lastVisit) values (?, ?, ?)';
		var sqlVariables = new Array()
		sqlVariables = [1, '', thisTime];
		
		dbQuery(sqlQuery, sqlVariables);
	}
	
	/*
		Search stations near a place
	*/
	
    function searchStationNear() {
        $("#search").bind('keypress', 
		function(e) {
			if(e.keyCode == 13) {
				// Stopping the position watcher
				
				$(this).blur();
				
				if (navigator.geolocation) {
					navigator.geolocation.clearWatch(geoWatch);
				} else {
					alert("La geolocalisation ne semble pas être supportée par votre navigateur");
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

	function searchLocation (address) {
		geocoder = new google.maps.Geocoder();
		geocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				var pos = new LatLon(results[0].geometry.location.lat(), results[0].geometry.location.lng());
				searchPosition(pos);
			} else {
				showSplash('unfortunate-search');
			}
		});
	}

	/*
		Geolocation utils
	*/
	
	function geoWatcher() {
		if (navigator.geolocation) {
			geoWatch = navigator.geolocation.watchPosition(function(position) {
				var curLatitude = position.coords.latitude;
				var curLongitude = position.coords.longitude;
			},
			// next function is the error callback
			geoErrorHandler,
			{timeout:27000, maximumAge: 30000, enableHighAccuracy:true}
			);
		} else {
			alert("La geolocalisation ne semble pas être supportée par votre navigateur");
		}
	}
	
	function geolocate() {
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(geoWatch);
			navigator.geolocation.getCurrentPosition(
			function (position) {
				var pos = new LatLon(position.coords.latitude, position.coords.longitude);
				searchPosition(pos); 
			}, 
			// next function is the error callback
			geoErrorHandler,	
			{timeout:27000, maximumAge: 30000, enableHighAccuracy:true}
			);
		} else {
			alert("La geolocalisation ne semble pas être supportée par votre navigateur");
		}
	}
	
	function geoErrorHandler (error) {
		switch(error.code) {
			case error.TIMEOUT:
				// Quite annoying
			 	//alert('Delai dépassé');
				break;
			case error.POSITION_UNAVAILABLE:
				alert('Position non disponible. Etes-vous dans un tunnel?');
				break;
			case error.PERMISSION_DENIED:
				alert('Freelib ne peut utiliser votre GPS. Est-il actif?');
				break;
			case error.UNKNOWN_ERROR:
				alert('Erreur inconnue');
				break;
		}
	}
	
	/*
		Searching stations in a perimeter of 500m around the defined position.
	*/

	function searchPosition(pos) {
		position = pos;
		showSplash('spin');
		var sqlQuery = 'SELECT * FROM map';
		dbQuery(sqlQuery, undefined, function(tx, rs) {
			if(rs.rows && rs.rows.length) {

				// Our flag to know if there are available stations
				var	stationsAround = 0;

				// The array transmitted to the getStationStatus function.
				var stations = new Array();

				// We go through all the stations
				for (i = 0; i < rs.rows.length; i++) {

					// Getting the position of the GPS
					var stationPosition = new LatLon(rs.rows.item(i)['lat'], rs.rows.item(i)['lng']);

					// If the station is in a permieter of 500m we keep it
					if (position.distanceTo(stationPosition) <= dist) {
						stationsAround++;

						// We fill the unsorted array
						stations.push([position.distanceTo(stationPosition),rs.rows.item(i)]);
					};			
				}

				if (stationsAround == 0) {
					showSplash('unfortunate-geo');
				} else {
					showSplash('none');
					// We sor the stations by the closest first
					stations.sort();
					// Adding the elements in the list
					
					stations.forEach(function(value, index, array) {
						var distance = value[0];
						var station = value[1];
						
						// We are usinge escape to avoid single quotes problems
						$("#search-wrapper #scroller").append('<li class="s' + station['number'] + '"><div id="station_top" onclick="freelib.showOptions(' + station['number'] + ', \'search-wrapper\');"><div class="location"><div class="adresse"><span id="velib_id">à ' + Math.round(distance*1000) + 'm</span>' + station['fullAddress'] + '</div></div><div class="velib_status"><div class="velib_num"><div class="sign1"></div><div class="flip"><div class="num1">?</div></div></div><div class="parks_num"><div class="sign2">P</div><div class="flip"><div class="num2">?</div></div></div></div><div class="clr"></div></div><div class="options"><div id="opt_refreshs"  onclick="freelib.refresh(' + station['number'] + ', \'search-wrapper\');"></div><div id="opt_map" onclick="freelib.openMap(' + station['lat'] + ',' + station['lng'] + ',' + pos._lat + ',' + pos._lon + ')"></div><div id="opt_add" onclick="freelib.addStation(' + station['number'] + ',\'' + escape(station['fullAddress']) +'\');"></div></div></li>');

						// Refreh the scroller with the new elements
						searchScroll.refresh();
						
					});

					// Refreh the scroller with the new elements
					searchScroll.refresh();

					// Asynchronous update of the stations status
					updateStationsStatus(stations.sort(), 'search-wrapper');

					// We continue to look for the users position
					geoWatcher();
				}
			} else {
				console.log('No results found. Database empty?');
			}
		});
	}
	
	/*
		Update the number and colors of each station
	*/
	
	function updateStationsStatus(stations, section) {
		
		stations.forEach(function(value, index, array) {
			var station = value[1];
			var xml = new Array();
			var stationURL = 'velib.php/?get=' + station['number'];
			
			$.getJSON(stationURL, 
				function(data) {
					var available = data.available;
					var free = data.free;
					
					if (available >= 5) { 
						$('#' + section + ' .s' + station['number'] + ' .sign1').addClass('green');
					}                                                         
					else {                                                    
						 $('#' + section + ' .s' + station['number'] + ' .sign1').addClass('red');
					}                                                         

					if (free >= 5) {                                          
						$('#' + section + ' .s' + station['number'] + ' .sign2').addClass('green'); 
					}                                                         
					else {                                                    
						$('#' + section + ' .s' + station['number'] + ' .sign2').addClass('red'); 
					}

					$('#' + section + ' .s' + station['number'] + ' .num1').text(available);
					$('#' + section + ' .s' + station['number'] + ' .num2').text(free);
				});
		});
			
	}
	
	/*
		Addition or deletion of stations in the favorites.
		
		action can take two values :
		- add
		- remove
	*/

	function modifyFavorites (stationNum, action, fullAddress) {
		var favoris;
		var sqlQuery = 'SELECT * FROM prefs';
		var sqlVariables = new Array();
		dbQuery(sqlQuery, undefined, function(tx, rs) {
			if(rs.rows && rs.rows.length) {
				if (rs.rows.item(0)['favoris'].search(stationNum) == -1  || action == 'remove' || action == 'moveup' || action == 'movedown') {
					switch(action) {
						// Add in the favorites
						case 'add':
							numFavs += 1;
							favoris = (rs.rows.item(0)['favoris'] == '' ? stationNum.toString() : rs.rows.item(0)['favoris'] + ',' + stationNum);
							break;
						// Remove from favorites
						case 'remove':
							numFavs -= 1;
							// if the list is not empty after removing an element
							if (rs.rows.item(0)['favoris'].split(',').length - 1 > 0) {
								rs.rows.item(0)['favoris'].split(',').forEach(function(value, index, array) {
									if (value != stationNum) {
										favoris = (favoris == null ? '': favoris + ',') + value;
									};
								});
							}
							else{
								favoris = '';
								showSplash('favs');
							}
							break;
						case 'moveup':
							var newStationList = new Array();
							newStationList = swap(rs.rows.item(0)['favoris'].split(',').indexOf(stationNum.toString()), rs.rows.item(0)['favoris'].split(',').indexOf(stationNum.toString())-1 ,rs.rows.item(0)['favoris'].split(','));
							newStationList.forEach(function(value, index, array) {
								favoris = (favoris == null ? '': favoris + ',') + value;
							});
							break;
						case 'movedown':
							var newStationList = new Array();
							newStationList = swap(rs.rows.item(0)['favoris'].split(',').indexOf(stationNum.toString()), rs.rows.item(0)['favoris'].split(',').indexOf(stationNum.toString())+1 ,rs.rows.item(0)['favoris'].split(','));
							newStationList.forEach(function(value, index, array) {
								favoris = (favoris == null ? '': favoris + ',') + value;
							});
							break;
					}
					
					sqlQuery = 'UPDATE prefs SET favoris=? WHERE id=1';
					sqlVariables = [favoris];
					
					dbQuery(sqlQuery, sqlVariables, function(tx, rs) {
						if(action == 'add') {
							addStationInDom(stationNum, unescape(fullAddress));
							updateFavoriteStation(stationNum, 'fav-wrapper');
							showFavs();
						}
					});
				}
				else if (action == 'add') {
					alert('Cette station est déjà dans vos favoris');
				}
			}
		});
	}
	
	/*
		Insertion of an element in the favorite list
	*/
	
	function addStationInDom (stationId, fullAddress) {
		$("#fav-wrapper #scroller").append($('<li class="s' + stationId + '"><div id="station_top" onclick="freelib.showOptions(' + stationId + ', \'fav-wrapper\');"><div class="location"><div class="adresse"><span id="velib_id">' + stationId + '</span>' + fullAddress + '</div></div><div class="velib_status"><div class="velib_num"><div class="sign1"></div><div class="flip"><div class="num1">?</div></div></div><div class="parks_num"><div class="sign2">P</div><div class="flip"><div class="num2">?</div></div></div></div><div class="clr"></div></div><div class="options"><div id="opt_refreshf" onclick="freelib.refresh(' + stationId + ', \'fav-wrapper\');"></div><div id="opt_del" onclick="freelib.remove(' + stationId + ');"></div><div id="opt_up" onclick="freelib.up(' + stationId + ');"></div><div id="opt_down" onclick="freelib.down(' + stationId + ');"></div></li>'));
	}
	
	/*
		Update the list of the favorites. Basically each time you launch freelib
	*/
	
	function updateFavoriteStations () {
		$("#fav-wrapper #scroller").html('');
		
		var sqlQuery = 'SELECT * FROM prefs';
		var sqlVariables = new Array();
		
		dbQuery(sqlQuery, undefined, function (tx, rs) {
			if(rs.rows && rs.rows.length) {
				var favoritesList = rs.rows.item(0)['favoris'];
				if (favoritesList != '') {
					numFavs = favoritesList.length;
					favoritesList.split(',').forEach(function(value, index, array) {
						var stationItem = value;
						sqlQuery = 'SELECT * FROM map WHERE number=?';
						sqlVariables = [stationItem];
						dbQuery(sqlQuery, sqlVariables, function(tx, results) {
							if(results.rows && results.rows.length) {
								// We fill the list in the DOM
								addStationInDom (results.rows.item(0)['number'], results.rows.item(0)['fullAddress']);
							
								// We retrive the status of each station
								updateFavoriteStation(results.rows.item(0)['number'], 'fav-wrapper');

								// Refreh the scroller with the new elements
								favScroll.refresh();													
							};
						});
					});
					showSplash('none');
				} else {
					// When loading and no favs
					showSplash('favs');
				}
			}
		});
	}
	
	function updateFavoriteStation (station, section) {
		
		// Clearing the actual status of the station.
		$('#' + section + ' .s' + station + ' .num1').text('?');
		$('#' + section + ' .s' + station + ' .num2').text('?');
		
		// Updating the station station.
		var stationToUpdate = new Array();
		stationToUpdate.push([0,{'number': station}]);
		updateStationsStatus(stationToUpdate, section);
	}
	
	/*
		Navigation through the different views 
	*/
	
	function showView (view) {
		section = view;
		switch(view) {
			case 'favs':
				showFavs();
				break;
			case 'search':
				showSearch();
				break;
			case 'info':
				showInfo();
				break;
		}
	}
	
	function showFavs() {
		// Stopping the position watcher
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(geoWatch);
		}
		else{
			console.log('Browser not supported.');
		}

		if (numFavs == 0) {
			showSplash('favs');
		} else {
			showSplash('none');
		}

		$("#fav-wrapper").css({'z-index': '2'});
		$("#search_box_bg").css({'z-index': '1', 'display': 'none'});			
		$("#middle").css({'top': '51px'});
		$("#cursor").css({'margin-left': '5px'});
		
		$("#cosmet").css({'top': '51px'});
		$('#cosmet').css('height', window.innerHeight-101 + 'px');

		$("#fav-wrapper #scroller").show();
		$("#search-wrapper #scroller").hide();
		$("#info-wrapper #scroller").hide();
		
	}
	
	function showSearch() {
		// For more accurate positionning 
		geoWatcher();

		showSplash('search');
		
		$("#search-wrapper").css({'z-index': '2'});
		$("#search_box_bg").css({'z-index': '3', 'display': 'block'});
		$("#middle").css({'top': -(window.innerHeight-205) + 'px'});
		$("#cursor").css({'margin-left': '85px'});
		
		$("#cosmet").css({'top': '101px'});
		$('#cosmet').css('height', window.innerHeight-154 + 'px');
		
		$("#fav-wrapper #scroller").hide();
		$("#search-wrapper #scroller").show();
		$("#info-wrapper #scroller").hide();
	}
	
	function showInfo() {
		// Stopping the position watcher
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(geoWatch);
		}
		else {
			console.log('Browser not supported.');
		}
		
		showSplash('none');
		
		$("#info-wrapper").css({'z-index': '2'});
		$("#search_box_bg").css({'z-index': '1', 'display': 'none'});
		$("#middle").css({'top': -(window.innerHeight-153)*2 + 'px'});
		$("#cursor").css({'margin-left': '165px'});
		
		$("#fav-wrapper #scroller").hide();
		$("#search-wrapper #scroller").hide();
		$("#info-wrapper #scroller").show();
		
		infoScroll.refresh();
	}
	
	function addStation (stationNum, fullAddress) {
		var ajouter=confirm('Ajouter la station ' + stationNum + ' à vos favoris?');
		if (ajouter == true) {
			modifyFavorites(stationNum, 'add', fullAddress)
		}
	}
	
	function showOptions(station, section) {
		$('#' + section + ' li').each(function(){
			if ($(this).height() == 140 && $(this).attr('class') == 's' + station) {
				$('#' + section + ' li.s' + station).css({'height' : '90px'});
			} else if($(this).height() == 90 && $(this).attr('class') == 's' + station) {
				$('#' + section + ' li.s' + station).css({'height' : '140px'});
			} else {
				$(this).css({'height' : '90px'});
			}
		});
		
		favScroll.refresh();
		searchScroll.refresh();
	}
	
	function refresh (station, section) {
		updateFavoriteStation(station, section);
	}
		
	function remove (station) {
		var remove=confirm('Êtes-vous sûr de vouloir supprimer la station ' + station + ' de vos favoris?');
		if (remove==true) {
			modifyFavorites(station, 'remove');
			
			// remove the element from the DOM
			$('#fav-wrapper .s' + station).remove();
		}
	}
	
	function up (station) {
		var currStation = $('#fav-wrapper .s' + station);
		var prevStation = $('#fav-wrapper .s' + station).prev().attr('class');
		if (prevStation != null) {
			$('#fav-wrapper .s' + station).remove();
			$('#fav-wrapper .' + prevStation).before(currStation);
			modifyFavorites (station, 'moveup');
		}
	}
	
	function down (station) {
		var currStation = $('#fav-wrapper .s' + station);
		var nextStation = $('#fav-wrapper .s' + station).next().attr('class');
		if (nextStation != null) {
			$('#fav-wrapper .s' + station).remove();
			$('#fav-wrapper .' + nextStation).after(currStation);
			modifyFavorites (station, 'movedown');
		}
	}
	
	function openMap (src_lat, src_long, dst_lat, dst_long) {
			if ($.os.android) {
				url = 'maps:maps.google.com/maps?daddr=' + src_lat + ',' + src_long + '&saddr=' + dst_lat + ',' + dst_long + '&dirflg=w&t=m';
			} else {
				url = 'http://maps.google.com/maps?daddr=' + src_lat + ',' + src_long + '&saddr=' + dst_lat + ',' + dst_long + '&dirflg=w&t=m';
			}
			
			window.open(url)
		}
	
	function showSplash(type) {
		var cosmet;
		switch(type) {
			case 'favs' :
				$("#fav-wrapper #scroller").html('');
				$('#cosmet').css('z-index', '3');
				$('#cosmet').css({'top': 51 + 'px', 'z-index' : 3});
				cosmet = '<ul><li class="text">Ajouter des stations</li><li class="add" onclick="freelib.showView(\'search\')"></li></ul>';
				$('#cosmet').html(cosmet);
				break;
			case 'search' :
				$("#search-wrapper #scroller").html('');
				$('#cosmet').css({'top': 154 + 'px', 'z-index' : 3});
				cosmet = '<ul><li class="search" onclick="$(\'#search\').focus()"></li><li class="geoloc" onclick="freelib.geolocate()"></li></ul>';
				$('#cosmet').html(cosmet);
				break;
			case 'unfortunate-geo' :
				$("#search-wrapper #scroller").html('');
				$('#cosmet').css({'top': 101 + 'px', 'z-index' : 3});
				cosmet = '<ul><li class="text">Aucune station à moins de 500m</li></ul>';
				$('#cosmet').html(cosmet);
				break;
			case 'unfortunate-search' :
				$("#search-wrapper #scroller").html('');
				$('#cosmet').css({'top': 101 + 'px', 'z-index' : 3});
				cosmet = '<ul><li class="text">Aucune station près de cette position</li></ul>';
				$('#cosmet').html(cosmet);
				break;
			case 'none' :
				$('#cosmet').css('z-index', '-1');
				$('#cosmet').html('');
				break;
			case 'spin' :
				// Cleaning the list before adding new ones
				$("#search-wrapper #scroller").html('');
				$('#cosmet').css('z-index', '3');
				$('#cosmet').html('');
				addSpinner('cosmet');
				break;
		}
	}
	
	function addSpinner (element) {
		var opts = {
		  lines: 6, // The number of lines to draw
		  length: 20, // The length of each line
		  width: 2, // The line thickness
		  radius: 20, // The radius of the inner circle
		  color: '#999', // #rbg or #rrggbb
		  speed: 1, // Rounds per second
		  trail: 50, // Afterglow percentage
		  shadow: true // Whether to render a shadow
		};
		var target = document.getElementById(element);
		var spinner = new Spinner(opts).spin();
		target.appendChild(spinner.el);
	}
	
	/* 
		Utils 
	*/
	
	function dbQuery (sqlQuery, sqlVariables, callback) {
		try {
            if (window.openDatabase) {
                db = openDatabase(databaseName, databaseVersion, databaseDesc, databaseMaxSize);
                if (db) {
					db.transaction(function(tx) {
						tx.executeSql(sqlQuery, (sqlVariables != undefined ? sqlVariables : []), (callback != undefined ? callback : function(){}));
					});
				} else {
					console.log('Error occurred while trying to open the DB');
				};
			} else {
				console.log('Web Databases not supported');
			};
		} catch(e) {
			console.log('Error occurred during DB init, Web Database supported?');
		};
	}
	
	/* 
		When we resize, we put everything right. 
	*/
	
	$(window).bind('resize', function(event) {
		$('#fav-wrapper').css('height', window.innerHeight - 101 + 'px');
		$('#search-wrapper').css('height', window.innerHeight - 154 + 'px');
		$('#info-wrapper').css('height', window.innerHeight - 101 + 'px');
		$('#cosmet').css('height', window.innerHeight - ((section == 'favs' || section == 'info') ? 101 : 154) + 'px');
		
		var top = ( section == 'favs' ? 51 : ( section == 'search' ? -(window.innerHeight-205) : ( section == 'info' ? -(window.innerHeight-153)*2 : null )));
		$("#middle").css({'top': top + 'px'});
	});
	
	/*
		Function to swap 2 elements in an array.
	*/
	function swap (a, b, list) {
		var element = list[b];
		list[b] = list[a];
		list[a] = element;
		return list;
	}
	
    return {
		init: init,
		reset: resetDB,
		getMap: getMap,
		geolocate: geolocate,
		showView: showView,
		addStation: addStation,
		showOptions: showOptions,
		refresh: refresh,
		remove: remove,
		up: up,
		down: down,
		openMap: openMap
    };
})();