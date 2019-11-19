$(function() {
  let socket = io();
  let $inp = document.getElementById('in');
  let $out = document.getElementById('out');

  document.addEventListener('keypress', function(key) {
    if ( key.keyCode != 13 ) $inp.focus();
  });

  let emptyOut = function() {
    $($out).empty();
  };

  let emptyIn = function() {
    $($inp).val('');
  };

  let print = function(text, options) {
    voice.speak(text, options);

    let newItem = $('<li>');
    let itemPlayButton = $('<div class="play-sound-button">');
    itemPlayButton.append('&#9658;');
    let itemText = $('<span>').text(text ? text.charAt(0) : '');
    newItem.append(itemPlayButton).append(itemText);
    $($out).append(newItem);

    let i = 1;
    let int = setInterval(function() {
      $(itemText).text($(itemText).text() + text.charAt(i++));
      if (i > text.length) {
        clearInterval(int);
        scrollTop();
      }
    }, 50);
  };

  $out.addEventListener('click', function(event) {
    let $target = $(event.target);
    if ($target.hasClass('play-sound-button')) {
      voice.speak($target.siblings().text());
    }
  });

  $($inp).bind('input', function() {
    let value = $(this).val();
    socket.emit('new message', value);
  });

  let voice;

  let initSpeaker = function () {
    window.speechSynthesis.onvoiceschanged = function() {
      let voices = speechSynthesis.getVoices();
      let ruVoices = voices.filter(v => v.lang == 'ru-RU')
      let russianVoice = ruVoices.find(v => v.name == 'Yuri') || ruVoices[Math.floor(Math.random()*ruVoices.length)];
      let milena = ruVoices.find(v => v.name == 'Milena');

      voice = {
        speak: function(text, options) {
          let msg = new SpeechSynthesisUtterance();
          msg.voice = russianVoice;
          msg.volume = 1;
          msg.rate = 0.8;
          msg.pitch = 1;
          msg.text = text;

          if (options) {
            Object.assign(msg, options);

            if (options.voiceRole == 'milena') {
              msg.voice = milena;
            }
          }
          speechSynthesis.speak(msg);
        }
      }
    };
  };
  initSpeaker();


  let recognition;
  let initRecognition = function() {
    recognition = new webkitSpeechRecognition();
    initListener();
    startListener();

    recognition.onresult = function(event) {
      let result = event.results[event.results.length - 1];
      // print(result[0].transcript);
      console.log('recognitions result: ' + result[0].transcript);
      socket.emit('new message', result[0].transcript);
    }
  };
  let initListener = function() {
    // const grammar = '#JSGF V1.0; grammar colors; public <color> = aqua | azure | beige | bisque | black | blue | brown | chocolate | coral | crimson | cyan | fuchsia | ghostwhite | gold | goldenrod | gray | green | indigo | ivory | khaki | lavender | lime | linen | magenta | maroon | moccasin | navy | olive | orange | orchid | peru | pink | plum | purple | red | salmon | sienna | silver | snow | tan | teal | thistle | tomato | turquoise | violet | white | yellow ;'
    // const recognition = new webkitSpeechRecognition();
    // const speechRecognitionList = new webkitSpeechGrammarList();
    // speechRecognitionList.addFromString(grammar, 1);
    // recognition.grammars = speechRecognitionList;
    recognition.continuous = true;
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    // recognition.maxAlternatives = 1;
  };
  let startListener = function() {
    try {
      recognition.start();
    } catch (e) {
      // console.log(e);
    }
  };
  initRecognition();


  setInterval(() => {
    if (!recognition) {
      initRecognition();
    } else {
      startListener();
    }
  }, 1000);

  socket.on('new response', function(msg, options) {
    emptyIn();
    if (msg && (msg.indexOf('http') > -1 || msg.indexOf('img/') > -1)) {
      let newItem = $('<li class="image-msg">');
      let link = $('<img />', {
        src: msg
      });
      $(newItem).append(link);
      let i = 1;
      $($out).append(newItem);
    }
    else {
      print(msg, options);
    }

    setTimeout(() => {
      scrollTop();
    }, 100)
  });

  function scrollTop() {
    $($out).animate({ scrollTop: $($out).prop("scrollHeight") - $($out).height() }, 0);
  }

  let sessionIsRestored = false;

  socket.on('restore session', function(arr) {
    if (!sessionIsRestored) {
      emptyIn();
      arr.forEach(msg => {
        let newItem = $('<li>');
        let itemPlayButton = $('<div class="play-sound-button">');
        itemPlayButton.append('&#9658;');
        let itemText = $('<span>').text(msg || '');
        newItem.append(itemPlayButton).append(itemText);
        $($out).append(newItem);
      });
      sessionIsRestored = true;
    }
  });
});
