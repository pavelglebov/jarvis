var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
	res.sendFile(__dirname + '/client/index.html');
});

var route = {
	'Initial': function(msg, socket) {
		if (msg.toLowerCase() == 'привет' ||
			msg.toLowerCase() == 'hello' ||
			msg.toLowerCase() == 'hi') {

			socket.emit('new response', 'Hi! My name is Jarvis.');
			setTimeout(function(){
				socket.emit('new response', 'This is my initial state with not much logic.');
			}, 2000);
		}
	}
};

var STATE = 'Initial';

var jarvis = [
	"Джарвис - это я",
	"Да да",
	"Мм?",
	"Я помогу вам",
	"Джжаааааарвииииииисссс",
	"",
	"",
	"Я вас слушаю",
	"Джа-джа-джарвис-джаарвиис",
	"http://cs624025.vk.me/v624025130/1ffbe/DdYgLRzsr5A.jpg"
];

io.on('connection', function(socket) {
		socket.on('new message', function(msg){
			if (msg.toLowerCase() == 'jarvis' ||
				msg.toLowerCase() == 'джарвис') {
				socket.emit('new jarvis', jarvis[Math.floor(Math.random() * (jarvis.length+1))]);
			}
			route[STATE](msg, socket);
		});
	});

http.listen(3000, function(){
	console.log('listening on *:3000');
});