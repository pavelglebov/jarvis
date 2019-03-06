const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const rounds = require('./configs/initial').rounds;
const Session = require('./db/main');

const args = process.argv.slice(2);

const useDb = true;

app.get('/', function(req, res, next) {
  if (useDb) {
    init();
    initSaveInterval();
  }
  next();
});
app.use(express.static("client"));

let conf = {
  roundIndex: 0,
  session: null,
  saveQueue: [],
  socket: {},
  prevMsg: '',
  restoreMode: args && args[0],
  roundRestored: false,
  currentDocId: null,
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
  ],
  easterEggs: {
    "ggrc": "ЖИИ ЖИИ ЭЭР СИИИИИИИИИИИ!",
    "настя": "https://scontent-frx5-1.xx.fbcdn.net/v/t1.0-9/19399136_10208655759141017_8875901088541622775_n.jpg?_nc_cat=100&_nc_ht=scontent-frx5-1.xx&oh=e5e61ff7378fb30931b6e6c1aed42b9d&oe=5D13E275"
  }
};

let restored;

if (conf.restoreMode) {
  restoreSession();
}

const init = function() {
  if (!conf.session) {
    if (restored) {
      conf.session = new Session({
        sessionCreated: new Date(),
        round: restored.round,
        messages: [].concat(restored.messages),
        feedback: [].concat(restored.feedback)
      });
    }
    else {
      conf.session = new Session({
        sessionCreated: new Date(),
        round: 0,
        messages: [],
        feedback: []
      });
    }
    saveSession();
  }
}

function restoreSession() {
    const id = args[0];

    Session.findById(id, (error, doc) => {
      if (error) {
        return console.log(`Error has occurred: ${error}`);
      }

      console.log('Restoring db by id: ' + doc._id);
      console.log(doc);
      // restored = doc.toObject();
      conf.session = doc;
    });
};

const processMessage = function(msg, socket) {
  console.log('Processing message: ' + msg);
  let successArr = rounds[conf.roundIndex] && rounds[conf.roundIndex].success;

  if (successArr && successArr.indexOf(msg) > -1) {
    changeRound();
    triggerOutputs(socket);
  }

  if (useDb) {
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
}

const triggerOutputs = function(socket) {
  console.log('Triggering outputs');

  const outputs = rounds[conf.roundIndex].output;

  if (outputs && outputs.length) {
    let currentIndex = 0;

    const triggerSingleOutput = function() {
      if (currentIndex < outputs.length) {
        const currentOutput = outputs[currentIndex];
        setTimeout(function() {
          emitMessage('new response', currentOutput.text, socket);
          triggerSingleOutput();
        }, currentOutput.timer);

        ++currentIndex;
      }
    }

    triggerSingleOutput();
  }
}

const changeRound = function() {
  ++conf.roundIndex;
  console.log('Changing round to ' + conf.roundIndex);

  if (useDb) {
      conf.session.round = conf.roundIndex;
    // saveSession();
  }
};

io.on('connection', function(socket) {
  // if (conf.restoreMode && conf.session && !conf.roundRestored) {
  //   conf.roundIndex = conf.session.round;
  //   changeRound();

  //   conf.roundRestored = true;
  // }
  if (useDb && conf.restoreMode && conf.session && !conf.roundRestored) {
    conf.roundIndex = conf.session.round;
    emitMessage('restore session', conf.session.messages, socket);
    triggerOutputs(socket);

    conf.roundRestored = true;
  }

  socket.on('new message', function(msg) {
    msg = msg.toLowerCase().trim();

    if (msg == 'jarvis' || msg == 'джарвис') {
      emitMessage('new response',
        conf.jarvis[randInd(conf.jarvis.length)],
        socket);
    }
    if (conf.easterEggs[msg]) {
      emitMessage('new response',
        conf.easterEggs[msg],
        socket);
    }
    if (msg == "подсказка") {
      let hints = rounds[conf.roundIndex].hints;
      hints ?
        emitMessage('new response',
          hints[randInd(hints.length)],
          socket) : '';
    }

    processMessage(msg, socket);
  });
});

function randInd(length) {
  return Math.floor(Math.random() * length);
}

const emitMessage = function(type, msg, socket) {
  socket.emit(type, msg);

  if (useDb) {
    conf.session.messages.push(msg);
    // saveSession();
  }
};

function saveSession() {
  if (useDb) {
    conf.session.save((error, doc) => {
      if (error) {
        return console.log(`Error has occurred: ${error}`);
      }
      console.log('Session saved: ' + doc._id);
      console.log(doc);
    });
  }
};

const initSaveInterval = function() {
  if (useDb) {
    setInterval(() => {
      saveSession();
    }, 30000);
  }
};

http.listen(3000, function() {
  console.log('listening on *:3000');
});
