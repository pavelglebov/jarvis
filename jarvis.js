var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var rounds = require('./configs/initial.json').rounds;

var roundIndex;
var successArr;

app.get('/', function(req, res) {
  init();
  res.sendFile(__dirname + '/client/index.html');
});

var init = function() {
  roundIndex = -1;
  successArr = [];
  changeRound();
}

var processMessage = function(msg) {
  console.log('Processing message: ' + msg);
  if (successArr && successArr.indexOf(msg) > -1) {
    changeRound();
  }
}

var triggerOutputs = function(outputs) {
  console.log('Triggering outputs');
  console.log(outputs && outputs.length);

  if (outputs && outputs.length) {
    var currentIndex = 0;

    var triggerSingleOutput = function() {
      if (currentIndex < outputs.length) {
        var currentOutput = outputs[currentIndex];
        setTimeout(function() {
          globalSocket.emit('new response', currentOutput.text);
          triggerSingleOutput();
        }, currentOutput.timer);

        ++currentIndex;
      }
    }

    triggerSingleOutput();
  }
}

var triggerSingleOutput = function(output) {
  console.log('Triggering single output');
};

var changeRound = function() {
  ++roundIndex;
  console.log('Changing round to ' + roundIndex);

  var round = rounds[roundIndex];
  successArr = round.success;

  triggerOutputs(round.output);
};

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

var globalSocket;

io.on('connection', function(socket) {
  globalSocket = socket;

  globalSocket.on('new message', function(msg) {
    if (msg.toLowerCase() == 'jarvis' ||
      msg.toLowerCase() == 'джарвис') {
        globalSocket.emit('new jarvis', jarvis[Math.floor(Math.random() * (jarvis.length+1))]);
    }

    processMessage(msg);
  });

});

http.listen(3000, function() {
  console.log('listening on *:3000');
});