$(function() {
	var socket = io();
	$('form').submit(function(){
		socket.emit('chat message', $('#m').val());
		$('#m').val('');
		return false;
	});
	socket.on('chat message', function(msg){
		$('#messages').append($('<li>').text(msg));
	});

	var $inp = document.getElementById('in');
	var $out = document.getElementById('out');
	document.addEventListener('keypress', function(key) {
		if ( key.keyCode != 13 ) $inp.focus();
	});
});