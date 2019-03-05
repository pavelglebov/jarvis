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

  let print = function(text) {
    voice.speak(text);

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

  let initSpeaker = function () {
    let msg = new SpeechSynthesisUtterance();
    let voices = window.speechSynthesis.getVoices();
    let ruVoices = voices.filter(v => v.lang == 'ru-RU')
    let russinaVoice = ruVoices.find(v => v.name == 'Yuri') || ruVoices[Math.floor(Math.random()*ruVoices.length)];
    msg.volume = 1;
    msg.rate = 1.5;
    msg.pitch = 0 ;

    return {
      speak: function(text) {
        msg.text = text;
        speechSynthesis.speak(msg);
      }
    }
  }
  let voice = initSpeaker();

  socket.on('new response', function(msg) {
    emptyIn();
    print(msg);
    $($out).animate({ scrollTop: $($out).prop("scrollHeight") - $($out).height() }, 0);
  });

  socket.on('new jarvis', function(msg){
    emptyIn();
    if (msg && msg.indexOf('http') > -1) {
      let newItem = $('<li data-color="1">');
      let link = $('<img />', {
        src: msg
      });
      $(newItem).append(link);
      let i = 1;
      $($out).append(newItem);
    }
    else {
      print(msg);
    }
    $($out).animate({ scrollTop: $($out).prop("scrollHeight") - $($out).height() }, 0);
  });

  socket.on('restore session', function(arr) {
    emptyIn();
    arr.forEach(msg => {
      let newItem = $('<li>');
      let itemPlayButton = $('<div class="play-sound-button">');
      itemPlayButton.append('&#9658;');
      let itemText = $('<span>').text(msg || '');
      newItem.append(itemPlayButton).append(itemText);
      $($out).append(newItem);
    });
  });
});