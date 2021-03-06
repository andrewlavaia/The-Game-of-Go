/* globals username, userid, io, Module, WGo */

'use strict';

(function () {
  WinJS.UI.processAll().then(function () { // eslint-disable-line

    var socket;
    var serverGame;

    // WGo variables
    var game;
    var gameSize = 19; // default board game size
    var gameRepeat = 'KO';
    // ko options available:
    // KO (ko is properly handled - new position cannot be same as previous)
    // ALL (same position cannot be repeated),
    // NONE (positions can be repeated)
    var board = new WGo.Board(document.getElementById('game-board'), {
      size: gameSize,
      width: 650,
    });

    // used in final scoring procedures
    var finalScoreBoard = new WGo.Board(document.getElementById('final-score-board'), {
      size: gameSize,
      width: 650,
    });
    var lockCount = 0; // used to track # of locks for final scoring procedure

    var passCount = 0; // used to track # of passes in a row
    var gameOver = false; // check whether game has ended to restrict new moves

    // board addEventListener variables
    var lastHover = false;
    var lastX = -1;
    var lastY = -1;

    // Chat variables
    var $messages = $('.messages'); // Messages area
    var FADE_TIME = 150; // ms

    // UI handler
    var calcScore_clickToggle = false;

    // used for final scoring procedure
    var colorToggle = 1;

    // initiate socket
    socket = io();
    // console.log(window.location.pathname.slice(7));

    socket.emit('gameReady', window.location.pathname.slice(7));

    // ---------------------------
    // jQuery
    // ---------------------------

    function updateUsers() {
      $('#userB').text(serverGame.users.black);
      $('#black-rank').text('(' + serverGame.users.blackRank + ')');
      $('#userW').text(serverGame.users.white);
      $('#white-rank').text('(' + serverGame.users.whiteRank + ')');
    }

    function updateCapCount() {
      $('#capcountB').text(game.getPosition().capCount.black);
      $('#capcountW').text(game.getPosition().capCount.white);
    }

    function displayBoardElements() {
      // user is not playing and is a guest
      if (username !== serverGame.users.white &&
         username !== serverGame.users.black) {
        if (gameOver === true) {
          $('#final-score-board').show();
          $('#game-board').hide();
          $('#calc-score').hide();
        }
        else {
          $('#game-board').show();
          $('#calc-score').show();
          $('#final-score-board').hide();
        }
        $('#final-score-back').show();
        $('#game-pass').hide();
        $('#game-resign').hide();
        $('#final-score-continue').hide();
        $('#final-score-lock').hide();
      }

      // game is officially over
      else if (gameOver === true) {
        $('#final-score-board').show();
        $('#final-score-back').show();
        $('#calc-score').hide();
        $('#game-board').hide();
        $('#game-pass').hide();
        $('#game-resign').hide();
        $('#final-score-continue').hide();
        $('#final-score-lock').hide();
      }

      // user is in final scoring determination
      else if (passCount === 2) {
        $('#final-score-board').show();
        $('#final-score-continue').show();
        $('#final-score-lock').show();
        $('#game-board').hide();
        $('#calc-score').hide();
        $('#game-pass').hide();
        $('#game-resign').hide();
        $('#final-score-back').hide();
      }

      // user is actively playing
      else {
        $('#game-board').show();
        $('#calc-score').show();
        $('#game-pass').show();
        $('#game-resign').show();
        $('#final-score-board').hide();
        $('#final-score-back').hide();
        $('#final-score-continue').hide();
        $('#final-score-lock').hide();
      }
    }

    // ---------------------------
    // Game Chat Functions (copied from gamechat.js)
    // ---------------------------
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

    // ---------------------------
    // Utility Functions
    // ---------------------------

    function secondsToHms(d) {
      var num;
      // var hours;
      var minutes;
      var seconds;

      num = Number(d);

      // hours = Math.floor(num / 3600);
      minutes = Math.floor((num % 3600) / 60);
      seconds = Math.floor(num % 3600 % 60);

      return ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2);
    }

    // ---------------------------
    // WGo Functions
    // ---------------------------

    function move(game, x, y, color) {
      // test legality of move
      var errorCode = game.play(x, y, color);
      switch (errorCode) {
        case 1:
          log('Illegal Move: given coordinates are not on board');
          return 0;

        case 2:
          log('Illegal Move: stone already on given coordinates');
          return 0;

        case 3:
          log('Illegal Move: suicide not allowed');
          return 0;

        case 4:
          log('Illegal Move: repeated position');
          return 0;

        default:
          break;
      }

      // remove dead stones from game
      game.validatePosition(WGo.B);
      game.validatePosition(WGo.W);

      passCount = 0;

      return 1;
    }

    // Draws all objects on the game board
    // drawBoard(game, board) or drawBoard(game, board, estimateScore());
    function drawBoard(game, board, arr) {
      var i;
      var x;
      var y;
      var blackCount = 0;
      var whiteCount = 0;
      var position = game.getPosition();

      if (typeof arr === 'undefined') {
        // clear board
        board.removeAllObjects();

        // draw all active stones
        for (i = 0; i < game.size * game.size; i++) {
          if (position.schema[i] !== 0) {
            y = i % game.size;
            x = Math.floor(i / game.size);
            // need to round down, otherwise it moves the stone one spot to the right
            // at certain sections of the board (bottom half).
            // Math.floor is very slow so this may be a place to optimize down the road

            if (position.schema[i] === 1) {
              board.addObject([{
                x: x,
                y: y,
                c: WGo.B,
              }]);
            } else if (position.schema[i] === -1) {
              board.addObject([{
                x: x,
                y: y,
                c: WGo.W,
              }]);
            }
          }
        }

      // draw estimated score array
      } else {
        // clear board
        // board.removeAllObjects();
        for (i = 0; i < arr.length; i++) {
          if (arr[i] !== 0) {
            y = i % game.size;
            x = Math.floor(i / game.size);
            // x needs to round down or else it moves the stone one to the right
            // at certain sections of the board (bottom half).
            // Math.floor is very slow so this may be a place to optimize down the road

            if (arr[i] === 1) {
              board.addObject([{
                x: x,
                y: y,
                type: 'mini',
                c: WGo.B,
              }]);
              blackCount++;
            } else if (arr[i] === -1) {
              board.addObject([{
                x: x,
                y: y,
                type: 'mini',
                c: WGo.W,
              }]);
              whiteCount++;
            }
          }
        }
        console.log('score estimate: ' + blackCount + ' - ' + whiteCount);
      }

      // update users and cap count every time board is drawn
      updateUsers();
      updateCapCount();
    }

    // Used to handle pass commands in a game to determine if game should end
    function pass(game) {
      game.pass();

      passCount++;

      if (passCount === 2) {
        log('Two passes in a row -> entering scoring mode');

        displayBoardElements();
        drawBoard(game, finalScoreBoard); // add original stones that were placed during game
        drawBoard(game, finalScoreBoard, estimateScore()); // add estimated scoring stones
        socket.emit('pauseTimer');

        // if score locked in, set gameOver = true

        // !!! allow clicking on final-score-board to set specific areas as dead or alive
      }
    }

    // --------------------------
    // Go Score Estimator
    // --------------------------

    function convertVectorToArray(vec) {
      var i;
      var positionArray = [];
      var positionVector = new Module.VectorInt();
      positionVector = vec;

      for (i = 0; i < positionVector.size(); i++) {
        positionArray.push(positionVector.get(i));
      }

      return positionArray;
    }

    function estimateScore() {
      var i;
      var instance = new Module.Goban();
      var instance2 = new Module.Goban();
      var vec = new Module.VectorInt();
      var scoreVec = new Module.VectorInt();
      var scoreArray = [];

      for (i = 0; i < 361; i++) {
        vec.push_back(game.getPosition().schema[i]);
      }

      instance.populateBoard(vec, gameSize);
      // instance.print();
      // console.log(instance.score());

      if (game.turn === 1) { // black's move
        instance2 = instance.estimate(Module.Color.BLACK, 10000, 0.35);
        // change # of simulations from 1000 to 10000 once optimized
      } else { // white's move
        instance2 = instance.estimate(Module.Color.WHITE, 10000, 0.35);
        // change # of simulations from 1000 to 10000 once optimized
      }
      // instance2.print();
      console.log(instance2.score());

      scoreVec = instance2.getScoreVector();
      // console.log(scoreVec);

      scoreArray = convertVectorToArray(scoreVec);
      // console.log(scoreArray);

      return scoreArray;
    }

    function initializeGame(serverGameState) {
      serverGame = serverGameState;

      if (serverGame.game == null) {
        gameSize = serverGameState.boardSize;
        board.setSize(gameSize);
        game = new WGo.Game(gameSize, gameRepeat);
        console.log('creating new game');
      } else {
        gameSize = serverGameState.boardSize;
        board.setSize(gameSize);
        game = new WGo.Game(serverGame.game);
        console.log('resuming game');
      }

      drawBoard(game, board);
    }


    // ---------------------------
    // Socket.io Handlers
    // ---------------------------

    socket.on('launchgame', function (msg) {
      console.log('launching game: ' + msg.game.id);

      initializeGame(msg.game);

      displayBoardElements();
    });

    socket.on('gameEndResponse', function (msg) {
      if (msg.gameId === serverGame.id) {

        if (msg.type === 'Resignation')
          log(msg.userId + ' has resigned.');

        gameOver = true;
        drawBoard(game, finalScoreBoard); // add original stones that were placed during game
        displayBoardElements();
      }
    });

    socket.on('timeloss', function (msg) {
      if (msg.gameId === serverGame.id) {
        log(msg.loser + ' has lost on time.');
        gameOver = true;
        displayBoardElements();
      }
    });

    // bad URL
    socket.on('gameNotFound', function () {
      console.log('game not found');
      window.location.href = '../gamelobby';
    });

    socket.on('move', function (msg) {
      if (serverGame && msg.gameId === serverGame.id && gameOver === false) {
        // console.log(msg.game);
        move(game, msg.x, msg.y, game.turn);
        drawBoard(game, board);
      }
    });

    socket.on('pass', function (msg) {
      console.log(msg);
      if (serverGame && msg.gameId === serverGame.id) {
        log('Your opponent has passed. It is now your turn.');
        pass(game);
      }
    });

    // ---------------------------
    // Final Score Submission Mode
    // ---------------------------
    socket.on('continue game', function (msg) {
      if (serverGame && msg.gameId === serverGame.id && gameOver === false) {
        log('Game resumed');
        displayBoardElements();
        // $('#final-score-lock').show(); // reset default status
        // $('#game-board').show(); // show original board
        // $('#final-score-board').hide(); // hide final score board
        lockCount = 0;
      }
    });

    socket.on('lock score', function (msg) {
      if (serverGame && msg.gameId === serverGame.id && gameOver === false) {
        log(msg.userId + ' has locked in their score.');
        lockCount++;

        if (lockCount === 2) {
          gameOver = true;

          socket.emit('finalScoreRequest', {
            userId: username,
            gameId: serverGame.id,
            game: game,
            whiteUser: serverGame.users.white,
            blackUser: serverGame.users.black,
            whiteScore: 110,
            blackScore: 115,
          });

          displayBoardElements();

          log('Game Over. Score submitted.')
        }
      }
    });

    socket.on('unlock score', function (msg) {
      if (serverGame && msg.gameId === serverGame.id &&
          gameOver === false && lockCount === 1) {
        $('#final-score-lock').show();
        log('Score unlocked.');
        lockCount = 0;
      }
    });

    socket.on('add stone to finalScoreBoard', function (msg) {
      if (serverGame && msg.gameId === serverGame.id && gameOver === false) {
        finalScoreBoard.addObject([{
          x: msg.x,
          y: msg.y,
          c: msg.c,
          type: msg.type,
        }]);
      }
    });

    // !!! need a way for users to mark dead stones efficiently at end of game
    // ??? if stones are 100% for one side from estimator, lock them or allow override?
    // option 1: BFS or DFS to mark all non-adjacent stones that are still alive->
    //      how to handle dead stones within that area?
    // option 2: color stones using mousedown to scroll over all stones?
    // option 3: algorithmically determine each all or nothing zone,
    //      whether it is alive or dead, and which color it belongs to?

    // ---------------------------
    // Game Timer
    // ---------------------------

    socket.on('timer', function (data) {
      $('#counter-black').html(secondsToHms(data.timer_black));
      $('#periods-black').html('Periods: ' + data.periods_black);
      $('#counter-white').html(secondsToHms(data.timer_white));
      $('#periods-white').html('Periods: ' + data.periods_white);
    });

    // check ping every three seconds
    setInterval(() => {
      socket.emit('pingRequest', {'startTime': Date.now()});
    }, 3000);

    socket.on('pingResponse', function (data) {
      if (data.userId === serverGame.users.white) {
        $('#ping-white').html('Ping: ' + data.ping);
      } else if (data.userId === serverGame.users.black) {
        $('#ping-black').html('Ping: ' + data.ping);
      }
    });

    // --------------------------
    // Button Event Handlers
    // --------------------------

    $('#game-back, #final-score-back').on('click', function () {
      socket.emit('leave chat', {
        userId: username,
        gameId: serverGame.id,
      });

      // send to game lobby
      window.location.href = '../gamelobby';
    });

    $('#game-resign').on('click', function () {
      // make sure user is one of the players in the game (not someone watching)
      if (username === serverGame.users.white ||
         username === serverGame.users.black) {

        socket.emit('resignRequest', {
          userId: username,
          gameId: serverGame.id,
          game: game,
        });
      }
    });

    $('#game-pass').on('click', function () {
      // make sure user is one of the players in the game (not someone watching)
      if ((username === serverGame.users.white && game.turn === WGo.W) ||
          (username === serverGame.users.black && game.turn === WGo.B)) {
        log('You have passed. It is no longer your turn.');


        // submit move to server
        socket.emit('move', {
          x: 0,
          y: 0,
          color: game.turn,
          gameId: serverGame.id,
          game: game,
          moveTime: Date.now(),
          whiteUser: serverGame.users.white,
          blackUser: serverGame.users.black,
          pass: true,
        });

        socket.emit('moveRequest', {
          gameID: serverGame.id,
          game: game,
        });

        pass(game);

        // send to game lobby
        // window.location.href = '../gamelobby';
      }
    });

    $('#calc-score').on('click', function () {
      calcScore_clickToggle = (calcScore_clickToggle !== true); // toggles between true and false
      if (calcScore_clickToggle === true) {
        drawBoard(game, board, estimateScore());
      } else {
        drawBoard(game, board);
      }
    });

    $('#final-score-continue').on('click', function () {
      socket.emit('continue game', {
        userId: username,
        gameId: serverGame.id,
      });
    });

    $('#final-score-lock').on('click', function () {
      socket.emit('lock score', {
        userId: username,
        gameId: serverGame.id,
      });
      $('#final-score-lock').hide();
    });


    // --------------------------
    // Board Event Handlers
    // --------------------------

    board.addEventListener('click', function (x, y) {
      // check if area scoring board is shown
      if (calcScore_clickToggle === true) {
        return;
      }

      // check if it's the correct player's move
      if (((game.turn === -1 && username === serverGame.users.white) ||
           (game.turn === 1 && username === serverGame.users.black)) &&
            gameOver === false) {
        if (move(game, x, y, game.turn) === 1) { // legal move
          // draw updated position
          drawBoard(game, board);

          // submit move to server
          socket.emit('move', {
            x: x,
            y: y,
            color: game.turn,
            gameId: serverGame.id,
            game: game,
            moveTime: Date.now(),
            whiteUser: serverGame.users.white,
            blackUser: serverGame.users.black,
            pass: false,
          });

          socket.emit('moveRequest', {
            gameID: serverGame.id,
            game: game,
          });
        }
      } else if (gameOver === true) {
        log('No more moves allowed. Game is over.');
      } else {
        log('Not your turn.');
      }

      // console.log(new WGo.Goban(gameSize));
    });

    board.addEventListener('mousemove', function (x, y) {
      // check if area scoring board is shown
      if (calcScore_clickToggle === true) {
        return;
      }

      // check if it's your move
      if (((game.turn === -1 && username === serverGame.users.white) ||
           (game.turn === 1 && username === serverGame.users.black)) &&
           gameOver === false) {
        if (x === -1 || y === -1 || (x === lastX && y === lastY)) {
          return;
        }

        // clear previous hover if there was one
        if (lastHover && game.getStone(lastX, lastY) === 0) {
          board.removeObjectsAt(lastX, lastY);
        }

        // add stone if no stone legally placed there in current game
        if (game.getStone(x, y) === 0) {
          board.addObject([{
            x: x,
            y: y,
            c: game.turn,
          }]);
          lastHover = true;
        }

        lastX = x;
        lastY = y;
      }
    });

    // clear hover if mouse leaves board
    board.addEventListener('mouseout', function (x, y) {
      if (lastHover && game.getStone(lastX, lastY) === 0) {
        board.removeObjectsAt(lastX, lastY);
      }

      lastHover = false;
    });

    // finalScoreBoard.addEventListener('mousemove', function (x, y) {
    //     console.log(x + ' - ' + y);
    //     console.log(game.getStone(x, y));
    //   });
    // });

    // add black or white mini-stone to finalScoreBoard
    finalScoreBoard.addEventListener('click', function (x, y) {
      var stoneColor;
      // assert(colorToggle == 1 || colorToggle == 2);
      if (colorToggle === 1) {
        stoneColor = WGo.B;
        colorToggle = 2;
      } else {
        stoneColor = WGo.W;
        colorToggle = 1;
      }

      // check that the user is playing and the game is not over
      if (((username === serverGame.users.white) ||
            username === serverGame.users.black) &&
            gameOver === false) {
        finalScoreBoard.addObject([{
          x: x,
          y: y,
          c: stoneColor,
          type: 'mini',
        }]);

        socket.emit('add stone to finalScoreBoard', {
          userId: username,
          gameId: serverGame.id,
          x: x,
          y: y,
          c: stoneColor,
          type: 'mini',
        });

        lockCount = 0;
        $('#final-score-lock').show();
      } else if (gameOver === true) {
        log('Game is over.');
      }
    });
  }); // end WinJS.UI.processAll()
})(); // end self invoking function
