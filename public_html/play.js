/* globals username, userid, io, google, Module, WGo */

'use strict'; // strict mode directive for eslint

(function () {
  WinJS.UI.processAll().then(function () { // eslint-disable-line
    var socket;
    var serverGame;
    var usersOnline = [];
    var myGames = [];

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
      width: 600,
    });

    // board addEventListener variables
    var lastHover = false;
    var lastX = -1;
    var lastY = -1;

    // UI handler
    var calcScore_clickToggle = false;

    // initiate socket
    socket = io();

    // ---------------------------
    // jQuery
    // ---------------------------

    function updateUsers() {
      $('#userB').text(serverGame.users.black);
      $('#userW').text(serverGame.users.white);
    }

    function updateCapCount() {
      $('#capcountB').text(game.getPosition().capCount.black);
      $('#capcountW').text(game.getPosition().capCount.white);
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
          alert('given coordinates are not on board');
          return 0;

        case 2:
          alert('stone already on given coordinates');
          return 0;

        case 3:
          alert('suicide not allowed');
          return 0;

        case 4:
          alert('repeated position');
          return 0;

        default:
          break;
      }

      // remove dead stones from game
      game.validatePosition(WGo.B);
      game.validatePosition(WGo.W);

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
                // type: "SQ",
                c: WGo.B,
              }]);
              blackCount++;
            } else if (arr[i] === -1) {
              board.addObject([{
                x: x,
                y: y,
                // type: "SQ",
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
        instance2 = instance.estimate(Module.Color.BLACK, 1000, 0.35);
        // change # of simulations from 1000 to 10000 once optimized
      } else { // white's move
        instance2 = instance.estimate(Module.Color.WHITE, 1000, 0.35);
        // change # of simulations from 1000 to 10000 once optimized
      }
      // instance2.print();
      // console.log(instance2.score());

      scoreVec = instance2.getScoreVector();
      // console.log(scoreVec);

      scoreArray = convertVectorToArray(scoreVec);
      // console.log(scoreArray);

      return scoreArray;
    }

    function initializeGame(serverGameState) {
      serverGame = serverGameState;

      // console.log (serverGame);

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

      // draw board
      drawBoard(game, board);
    }


    // ---------------------------
    // Socket.io Handlers
    // ---------------------------

    socket.on('launchgame', function (msg) {
      console.log('launching game: ' + msg.game.id);

      initializeGame(msg.game);

    });

    socket.on('resign', function (msg) {
      if (msg.gameId === serverGame.id) {
        socket.emit('login', username);

        updateGamesList(); // used when resign is broadcasted

      }
    });

    socket.on('joingame', function (msg) {
      console.log('joined game id: ' + msg.game.id);

      initializeGame(msg.game);

    });

    socket.on('move', function (msg) {
      if (serverGame && msg.gameId === serverGame.id) {
        // console.log(msg.game);
        move(game, msg.x, msg.y, game.turn);
        drawBoard(game, board);
      }
    });


    socket.on('logout', function (msg) {
      removeUser(msg.username);
    });

    // ---------------------------
    // Game Timer
    // ---------------------------

    socket.on('timer', function (data) {
      $('#counter-black').html(secondsToHms(data.timer_black) + '|' + data.periods_black);
      $('#counter-white').html(secondsToHms(data.timer_white) + '|' + data.periods_white);
    });

    socket.on('ping', function () {
      socket.emit('pong');
    });

    /*
          socket.on('drawChart', function() {
            drawChart();
          });
    */

    // --------------------------
    // Button Event Handlers
    // --------------------------

    $('#game-back').on('click', function () {
      socket.emit('login', username);

      $('#page-game').hide();
      $('#users').hide();
      $('#board').hide();
      $('#capcount').hide();
      $('#page-lobby').show();
    });

    $('#game-resign').on('click', function () {
      socket.emit('resign', {
        userId: username,
        gameId: serverGame.id,
      });

      // send to game lobby
      /*
      socket.emit('login', username);
      */
    });

    $('#calc-score').on('click', function () {
      calcScore_clickToggle = (calcScore_clickToggle !== true); // toggles between true and false
      if (calcScore_clickToggle === true) {
        drawBoard(game, board, estimateScore());
      } else {
        drawBoard(game, board);
      }
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
      if ((game.turn === -1 && username === serverGame.users.white) ||
        (game.turn === 1 && username === serverGame.users.black)) {
        if (move(game, x, y, game.turn) === 1) { // legal move
          // draw updated position
          drawBoard(game, board);

          // broadcast move to opponent
          socket.emit('move', {
            x: x,
            y: y,
            color: game.turn,
            gameId: serverGame.id,
            game: game,
            moveTime: Date.now(),
          });
        }
      } else {
        alert('not your turn');
      }

      // console.log(new WGo.Goban(gameSize));
    });


    board.addEventListener('mousemove', function (x, y) {
      // check if area scoring board is shown
      if (calcScore_clickToggle === true) {
        return;
      }

      // check if it's your move
      if ((game.turn === -1 && username === serverGame.users.white) ||
        (game.turn === 1 && username === serverGame.users.black)) {
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
  }); // end WinJS.UI.processAll()
})(); // end self invoking function
