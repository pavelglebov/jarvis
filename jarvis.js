const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const rounds = require('./configs/initial').rounds;
const Session = require('./db/main');

var args = process.argv.slice(2);

app.get('/', function(req, res, next) {
  init();
  initSaveInterval();
  next();
});
app.use(express.static("client"));

let conf = {
  roundIndex: -1,
  successArr: [],
  session: {},
  saveQueue: [],
  socket: {},
  debounce: false,
  prevMsg: '',
  jarvis: [
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
  ]
};

const init = function() {
  if (args && args[0]) {
    return restoreSession();
  }
  else {
    conf.session = new Session({
      created: new Date(),
      round: 0,
      messages: [],
      feedback: []
    });
    saveSession(conf.session);
  }

  conf.roundIndex = -1;
  conf.successArr = [];
  changeRound();
}

const restoreSession = function() {
    const id = args[0];

    Session.findById(id, (error, doc) => {
      if (error) {
        return console.log(`Error has occurred: ${error}`);
      }

      console.log('Restoring db by id: ' + doc._id);
      console.log(doc);
      conf.session = doc;

      conf.restoreMode = true;
    })
};

const processMessage = function(msg) {
  console.log('Processing message: ' + msg);
  if (conf.successArr && conf.successArr.indexOf(msg) > -1) {
    changeRound();
  }

  if (msg.indexOf(conf.prevMsg) > -1
      && msg.length > conf.prevMsg.length
      && conf.prevMsg.length) {
    conf.session.feedback.pop();
    conf.session.feedback.push(msg);
  } else if (conf.prevMsg.indexOf(msg) > -1
      && conf.prevMsg.length > msg.length) {
    // do nothing
  } else {
    conf.session.feedback.push(msg);
  }
  conf.prevMsg = msg;
}

const triggerOutputs = function(outputs) {
  console.log('Triggering outputs');

  if (outputs && outputs.length) {
    let currentIndex = 0;

    const triggerSingleOutput = function() {
      if (currentIndex < outputs.length) {
        const currentOutput = outputs[currentIndex];
        setTimeout(function() {
          emitMessage('new response', currentOutput.text);
          triggerSingleOutput();
        }, currentOutput.timer);

        ++currentIndex;
      }
    }

    triggerSingleOutput();
  }
}

const changeRound = function(restoreMode) {
  ++conf.roundIndex;
  console.log('Changing round to ' + conf.roundIndex);

  const round = rounds[conf.roundIndex];
  conf.successArr = round.success;

  if (!restoreMode) {
    triggerOutputs(round.output);
  }

  conf.session.round = conf.roundIndex;
};

io.on('connection', function(socket) {
  conf.socket = socket;

  if (conf.restoreMode) {
    emitMessage('restore session', conf.session.messages);
    conf.roundIndex = conf.session.round - 1;
    conf.successArr = [];
    changeRound(true);
  }

  conf.socket.on('new message', function(msg) {
    if (msg.toLowerCase() == 'jarvis' ||
      msg.toLowerCase() == 'джарвис') {
        emitMessage('new jarvis',
          conf.jarvis[Math.floor(Math.random() * (conf.jarvis.length+1))]);
    }

    processMessage(msg);
  });
});

const emitMessage = function(type, msg) {
  conf.socket.emit(type, msg);

  conf.session.messages.push(msg);
};

const saveSession = function() {
  conf.session.save((error, doc) => {
    if (error) {
      return false;
    }
    console.log('Session saved: ' + doc._id);
    console.log(doc);
    return false;
  });
};

const initSaveInterval = function() {
  setInterval(() => {
    saveSession();
  }, 2000);
};

http.listen(3000, function() {
  console.log('listening on *:3000');
});