/*
function getStationsStatus(stations) {
	$.each(stations, function(){
		var yqlUrl = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D'"
		var stationURL = "http%3A%2F%2Fwww.velib.paris.fr%2Fservice%2Fstationdetails%2F";
		var stationID = this;
		var yqlCallBack = "'&format=json&callback=?";
		var url = yqlUrl + stationURL + stationID + yqlCallBack;
		
		$.getJSON(
			url,
			function(data) {
				var available = data.query.results.station.available;
				var free = data.query.results.station.free;
				var total = data.query.results.station.total;
				var ticket = data.query.results.station.ticket;
				
				$('body').append('<h2>' + stationID  + '</h2>');
				$('body').append('<p>available : ' + available  + '</p>');
				$('body').append('<p>free : ' + free  + '</p>');
				$('body').append('<p>total : ' + total  + '</p>');
				$('body').append('<p>ticket : ' + ticket  + '</p>');
		})
		.error(function(){
			//Deal with it.
		});	
	});
}

var stations = [14011, 14012, 14013];

$(document).ready(getStationsStatus(stations));
*/
