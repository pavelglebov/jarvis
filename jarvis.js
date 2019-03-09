const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const config = require('./configs/initial');
const rounds = config.rounds;
const easterEggs = config.easterEggs;
const jarvis = config.jarvis;

const parseArgs = require('./utils/args-parser');
const args = parseArgs(process.argv);
console.log(args);

const Session = require('./db/main');
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
  currentDocId: null
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
  let eggs = rounds[conf.roundIndex] && rounds[conf.roundIndex].eggs;

  if (successArr && successArr.indexOf(msg) > -1) {
    changeRound();
    triggerOutputs(socket);
  }

  if (eggs && eggs[msg]) {
    if (eggs[msg].length) {
      eggs[msg].forEach((el) => {
        emitMessage('new response', el, socket);
      });
    }
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
        jarvis[randInd(jarvis.length)],
        socket);
    }
    if (easterEggs[msg]) {
      easterEggs[msg].forEach((m) => {
        emitMessage('new response',
          m,
          socket);
      });
    }
    if (msg == "подсказка" || msg == "подскажи") {
      let hints = rounds[conf.roundIndex].hints;

      if (hints) {
        handleHints(hints, socket);
      }
    }

    processMessage(msg, socket);
  });
});

function handleHints(hints, socket) {
    if (!conf.hintTimer) {
      conf.hintTimer = setTimeout(() => {
          clearTimeout(conf.hintTimer);
          conf.hintTimer = false;
      }, 60000);

      emitMessage('new response',
        hints[randInd(hints.length)],
        socket);
    }
}

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
