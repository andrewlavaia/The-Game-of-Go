
/* globals username, io */

'use strict';

$(function () {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  // var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  // var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  var socket = io();

  var serverGame;
  // var gameID = window.location.pathname.slice(7);

  // initializeChat(gameID); // !!! move to socket event
  // need to limit chat to current game only

  /*
  function addParticipantsMessage(data) {
    var message = '';
    if (data.numUsers === 1) {
      message += 'there is 1 participant';
    } else {
      message += 'there are ' + data.numUsers + ' participants';
    }
    log(message);
  }
  */

  // Sets the client's username
  function setUsername() {
    // username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      // $loginPage.fadeOut();
      $chatPage.show();
      // $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', {
        username: username,
        gameid: serverGame.id,
      });
    }
  }


  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Log a message
  function log(message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Prevents input from having injected markup
  function cleanInput(input) {
    return $('<div/>').text(input).html();
  }

  // Updates the typing event
  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing', {
          username: username,
          gameid: serverGame.id,
        });
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing', {
            username: username,
            gameid: serverGame.id,
          });
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor(username) {
    var hash = 7;
    var index;
    var i;

    // Compute hash code
    for (i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }

    // Calculate color
    index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Adds the visual chat message to the message list
  function addChatMessage(data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Sends a chat message
  function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message,
        gameid: serverGame.id,
      });
      // tell server to execute 'new message' and send along parameters
      socket.emit('new message', {
        message: message,
        gameid: serverGame.id,
      });
    }
  }

  // ------------------------
  // Keyboard events
  // ------------------------
  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing', {
          username: username,
          gameid: serverGame.id,
        });
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function () {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  /*
  $loginPage.click(function () {
    $currentInput.focus();
  });
  */

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // ----------------------------
  // Socket events
  // ----------------------------

  socket.on('launchChat', function (msg) {
    var message = 'Game #' + window.location.pathname.slice(7);

    serverGame = msg.game;
    setUsername();

    connected = true;

    // Display the welcome message
    log(message, {
      prepend: true,
    });

  });

  /*
  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    var message = 'Game #' + window.location.pathname.slice(7);

    connected = true;

    // Display the welcome message
    log(message, {
      prepend: true,
    });

    // addParticipantsMessage(data);
  });
  */

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    if (serverGame && serverGame.id === data.gameid) {
      addChatMessage(data);
    }
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    if (serverGame && serverGame.id === data.gameid) {
      log(data.username + ' joined');
      // addParticipantsMessage(data);
    }
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    if (serverGame && serverGame.id === data.gameid) {
      log(data.username + ' left');
      // addParticipantsMessage(data);
      removeChatTyping(data);
      console.log(data.username + ' - ' + data.gameid);
    }
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    if (serverGame && serverGame.id === data.gameid) {
      addChatTyping(data);
    }
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    if (serverGame && serverGame.id === data.gameid) {
      removeChatTyping(data);
    }
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', {
        username: username,
        gameid: serverGame.id,
      });
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });
});
