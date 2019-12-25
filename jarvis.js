// vendors
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const {getRandomItem} = require('./helpers');

// parse process arguments
const parseArgs = require('./utils/args-parser');
const args = parseArgs(process.argv);
const usedb = args.usedb;
const configPath = args.configPath || './configs/';
const configName = args.config || 'initial';

// read config
const config = require(`${configPath}/${configName}.js`);
const {
  failMessages = [],
  failMessagesFrequency = 0,
  rounds,
  easterEggs,
  jarvis,
  defaultHintsConfig,
} = config;

let Session;
if (usedb) {
  Session = require('./db/main');
}

let numberOfFailures = 0;

function shouldSendFailMessage() {
  if (conf.roundIndex === 0) {
    return false;
  }
  const randomNum = Math.random();
  return randomNum < failMessagesFrequency;
}

app.get('/', function(req, res, next) {
  if (usedb) {
    init();
    initSaveInterval();
  }
  next();
});

app.get('/img/:imgName', function(req, res) {
  const file = path.join(__dirname,
      `/${configPath}/img/${req.params.imgName}`);

  console.log(`Sending image: ${file}`);
  res.sendFile(file);
});

app.use(express.static("client"));

let conf = {
  roundIndex: args.round || 0,
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

      console.log(`Restoring db by id: ${doc._id}`);
      console.log(doc);
      // restored = doc.toObject();
      conf.session = doc;
    });
};

const processMessage = function(msg, socket) {
  console.log(`Processing message: ${msg}`);
  const currentRound = rounds[conf.roundIndex];
  const successArr = currentRound && currentRound.success;
  const currentRoundEggs = currentRound && currentRound.eggs;

  const successCriteria = successArr.some((successItem) => {
    if (typeof successItem === 'object') {
      if (successItem.type === 'regex') {
        const regex = new RegExp(successItem.regex, 'u');
        return msg.match(regex);
      }
    }
    return msg === successItem;
  });

  if (successCriteria) {
    changeRound();
    triggerOutputs(socket);
  } else {
    numberOfFailures++;
    const hintsConfig = currentRound.hintsConfig || defaultHintsConfig;

    if (hintsConfig.includes(numberOfFailures) && currentRound.hints && currentRound.hints.length) {
      respond(getRandomItem(currentRound.hints), socket);
    } else if (currentRoundEggs && currentRoundEggs[msg] && currentRoundEggs[msg].length) {
      currentRoundEggs[msg].forEach((egg) => {
        respond(egg, socket);
      });
    } else if (easterEggs[msg]) {
      easterEggs[msg].forEach((m) => {
        respond(m, socket);
      });
    } else if (msg === 'jarvis' || msg === 'джарвис') {
      respond(getRandomItem(jarvis), socket);
    } else if ((msg.includes("подсказка") || msg.includes("подскажи")) && currentRound.hints) {
      handleHints(currentRound.hints, socket);
    } else if (shouldSendFailMessage()) {
      respond(getRandomItem(failMessages), socket);
    }
  }

  if (usedb) {
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

let nextMessageTimerId;

const triggerOutputs = function(socket) {
  console.log('Triggering outputs');

  const outputs = rounds[conf.roundIndex].output;

  if (outputs && outputs.length) {
    let currentIndex = 0;

    const triggerSingleOutput = function() {
      if (currentIndex < outputs.length) {
        const currentOutput = outputs[currentIndex];
        nextMessageTimerId = setTimeout(function() {
          nextMessageTimerId = 0;
          respond(currentOutput.text, socket, currentOutput.options);
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
  numberOfFailures = 0;
  console.log(`Changing round to ${conf.roundIndex}`);

  if (nextMessageTimerId) {
    clearTimeout(nextMessageTimerId);
  }
  if (usedb) {
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
  if (usedb && conf.restoreMode && conf.session && !conf.roundRestored) {
    conf.roundIndex = conf.session.round;
    emitMessage('restore session', conf.session.messages, socket);
    triggerOutputs(socket);

    conf.roundRestored = true;
  }

  socket.on('new message', function(msg) {
    processMessage(msg.toLowerCase().trim(), socket);
  });
});

function handleHints(hints, socket) {
    if (!conf.hintTimer) {
      conf.hintTimer = setTimeout(() => {
          clearTimeout(conf.hintTimer);
          conf.hintTimer = false;
      }, 10000);

      respond(getRandomItem(hints), socket);
    }
}

function respond(message, socket, options) {
  emitMessage('new response', message, socket, options);
}

const emitMessage = function(type, msg, socket, options) {
  socket.emit(type, msg, options);

  if (usedb) {
    conf.session.messages.push(msg);
    // saveSession();
  }
};

function saveSession() {
  if (usedb) {
    conf.session.save((error, doc) => {
      if (error) {
        return console.log(`Error has occurred: ${error}`);
      }
      console.log(`Session saved: ${doc._id}`);
      console.log(doc);
    });
  }
};

const initSaveInterval = function() {
  if (usedb) {
    setInterval(() => {
      saveSession();
    }, 30000);
  }
};

http.listen(3000, function() {
  console.log('listening on *:3000');
});
