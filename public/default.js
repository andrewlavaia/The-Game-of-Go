
(function () {
    
    WinJS.UI.processAll().then(function () {
      
      var socket, serverGame;
      var username, playerColor;
      var usersOnline = [];
      var myGames = [];
      socket = io();

      // WGo variables
      var game;
      var gameSize = 19;
      var gameRepeat = "KO";  // options available: KO (ko is properly handled - new position cannot be same as previous position)
                              // ALL (same position cannot be repeated), NONE (positions can be repeated)
      var board = new WGo.Board(document.getElementById("board"), {width: 600,});

      // board addEventListener variables 
      var lastHover = false;
      var lastX = -1; 
      var lastY = -1; 

      // UI handler
      var calcScore_clickToggle = false;


      // Hide go board until game is initialized
      $('#users').hide();
      $('#board').hide();
      $('#capcount').hide();

           
      //////////////////////////////
      // Socket.io handlers
      ////////////////////////////// 
      
      socket.on('login', function(msg) {
            usersOnline = msg.users;
            updateUserList();
            
            myGames = msg.games;
            updateGamesList();
      });
      
      socket.on('joinlobby', function (msg) {
        //removeUser(msg); // in case the user is already in the lobby for whatever reason
        addUser(msg);
      });
      
       socket.on('leavelobby', function (msg) {
        removeUser(msg);
      });
      
      socket.on('gameadd', function(msg) {
      });
      
      socket.on('resign', function(msg) {
        if (msg.gameId == serverGame.id) {

          socket.emit('login', username);

          $('#page-lobby').show();
          $('#page-game').hide();
          $('#users').hide();
          $('#board').hide();
          $('#capcount').hide();
        }            
      });
                  
      socket.on('joingame', function(msg) {
        console.log("joined as game id: " + msg.game.id );   
        playerColor = msg.color;
        initializeGame(msg.game);
        
        $('#page-lobby').hide();
        $('#page-game').show();
        $('#users').show();
        $('#board').show();
        $('#capcount').show();
        
      });

      socket.on('move', function (msg) {
        if (serverGame && msg.gameId === serverGame.id) {
          //console.log(msg.game);
          move(game, msg.x, msg.y, game.turn); 
          drawBoard(game, board); 
        } 
      });
    
      
      socket.on('logout', function (msg) {
        removeUser(msg.username);
      });
      

      
      //////////////////////////////
      // Menus
      ////////////////////////////// 
      $('#login').on('click', function() {
        username = $('#username').val();
        
        if (username.length > 0) {
            $('#userLabel').text(username);
            socket.emit('login', username);
            
            $('#page-login').hide();
            $('#page-lobby').show();
        } 
      });
      
      $('#game-back').on('click', function() {

        socket.emit('login', username);

        $('#page-game').hide();
        $('#users').hide();
        $('#board').hide();
        $('#capcount').hide();
        $('#page-lobby').show();
      });
      
      $('#game-resign').on('click', function() {
        socket.emit('resign', {userId: username, gameId: serverGame.id});
        
        socket.emit('login', username);
        $('#page-game').hide();
        $('#users').hide();
        $('#board').hide();
        $('#capcount').hide();
        $('#page-lobby').show();
      });
      
      var addUser = function(userId) {
        usersOnline.push(userId);
        updateUserList();
      };
    
     var removeUser = function(userId) {
          for (var i=0; i<usersOnline.length; i++) {
            if (usersOnline[i] === userId) {
                usersOnline.splice(i, 1);
            }
         }
         
         updateUserList();
      };
      
      var updateGamesList = function() {
        document.getElementById('gamesList').innerHTML = '';
        myGames.forEach(function(game) {
          $('#gamesList').append($('<button>')
                        .text('#'+ game)
                        .on('click', function() {
                          socket.emit('resumegame',  game);
                        }));
        });
      };
      
      var updateUserList = function() {
        document.getElementById('userList').innerHTML = '';
        usersOnline.forEach(function(user) {
          $('#userList').append($('<button>')
                        .text(user)
                        .on('click', function() {
                          socket.emit('invite',  user);
                        }));
        });
      };


      $('#calc-score').on('click', function() {
        calcScore_clickToggle = (calcScore_clickToggle === true) ? false : true;

        var position = game.getPosition();
        if(calcScore_clickToggle == true) {
          drawScoreBoard(getAreaScoringPosition(position), board);
        } else {
          drawBoard(game, board);
        } 
      });


           
      //////////////////////////////
      // Chess Game
      ////////////////////////////// 
/*      
      var initGame = function (serverGameState) {
        serverGame = serverGameState; 
        
          var cfg = {
            draggable: true,
            showNotation: false,
            orientation: playerColor,
            position: serverGame.board ? serverGame.board : 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
          };
               
          game = serverGame.board ? new Chess(serverGame.board) : new Chess();
          board = new ChessBoard('game-board', cfg);

      }
       
      // do not pick up pieces if the game is over
      // only pick up pieces for the side to move
      var onDragStart = function(source, piece, position, orientation) {
        if (game.game_over() === true ||
            (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
            (game.turn() !== playerColor[0])) {
          return false;
        }
      };  
      
    
      
      var onDrop = function(source, target) {
        // see if the move is legal
        var move = game.move({
          from: source,
          to: target,
          promotion: 'q' // NOTE: always promote to a queen for example simplicity
        });
      
        // illegal move
        if (move === null) { 
          return 'snapback';
        } else {
           socket.emit('move', {move: move, gameId: serverGame.id, board: game.fen()});
        }
      
      };
      
      // update the board position after the piece snap 
      // for castling, en passant, pawn promotion
      var onSnapEnd = function() {
        board.position(game.fen());
      };

*/
      //////////////////////////////
      // WGo Game
      ////////////////////////////// 

      var move = function(game, x, y, color) {
        // test legality of move
        var errorCode = game.play(x, y, color);
        switch(errorCode) {
          case 1:
            alert('given coordinates are not on board');
            return 0;
            break;
          case 2:
            alert('stone already on given coordinates');
            return 0;
            break;
          case 3:
            alert('suicide not allowed');
            return 0;
            break;
          case 4:
            alert('repeated position');
            return 0;
            break;
          default:
            break;
        } 

        //remove dead stones from game
        game.validatePosition(WGo.B); 
        game.validatePosition(WGo.W); 
        
        return 1;
      };

      var drawBoard = function(game, board) {
        // clear board
        board.removeAllObjects();
        
        // draw all active stones
        for(i=0; i < game.size * game.size; i++) {
          if(game.getPosition().schema[i] != 0) {
            var y = i % game.size;
            var x = Math.floor(i / game.size); // need to round down, otherwise it moves the stone one spot to the right 
                                               // at certain sections of the board (bottom half).
                                               // Math.floor is very slow so this may be a place to optimize down the road
            var position = game.getPosition();
            if(position.schema[i] == 1) {
              board.addObject([{x: x, y: y, c: WGo.B}]);
            } else if(position.schema[i] == -1) {
              board.addObject([{x: x, y: y, c: WGo.W}]);
            }
          }
        }

        // update users and cap count every time board is drawn
        updateUsers();
        updateCapCount();
      };   

      var drawScoreBoard = function(position, board) {
        var blackCount = 0;
        var whiteCount = 0;

        // draw squares
        for(i=0; i < position.size*position.size; i++) {
          if(position.schema[i] != 0) {
            var y = i % position.size;
            var x = Math.floor(i / position.size); // need to round down, otherwise it moves the stone one spot to the right 
                                                   // at certain sections of the board (bottom half).
                                                   // Math.floor is very slow so this may be a place to optimize down the road
            if(position.schema[i] == 1) {
              board.addObject([{x: x, y: y, type: "SQ", c: WGo.B}]);
              blackCount++;
            } else if(position.schema[i] == -1) {
              board.addObject([{x: x, y: y, type: "SQ", c: WGo.W}]);
              whiteCount++;
            }
          }
        }

      }; 

      var initializeGame = function(serverGameState) {

        serverGame = serverGameState; 
        //console.log (serverGame);

        if (serverGame.game == null ) {
          game = new WGo.Game(gameSize, gameRepeat);
          console.log("creating new game");
        } else {
          game = new WGo.Game(serverGame.game);
          console.log("resuming game")
        }

       
        //console.log(game);

        // draw board
        drawBoard(game, board);
      }; 

      var updateUsers = function() {
        $('#userB').text("Black: " + serverGame.users.black);
        $('#userW').text("White: " + serverGame.users.white);
      };

      var updateCapCount = function() {
        $('#capcountB').text("Black: " + game.getPosition().capCount.black);
        $('#capcountW').text("White: " + game.getPosition().capCount.white);
      };

      var getAreaScoringPosition = function(pos) {
        var position = new WGo.Position(pos.size);
        position.color = pos.color;
        position.size = pos.size;
        position.capCount = {
          black: pos.capCount.black,
          white: pos.capCount.white
        };

        position.schema = estimateAreaScoring(pos);

        return position;
      };

      var estimateAreaScoring = function(pos) {
        var positionArray = new Array(pos.schema.length);
        
        for(var i = 0; i < pos.schema.length; i++) {
          positionArray[i] = 1;
        }

        return positionArray;

      };

      board.addEventListener("click", function(x, y) {

        // check if it's the correct player's move
        if(( game.turn == -1 && username == serverGame.users.white ) ||
           ( game.turn == 1 && username == serverGame.users.black) ) {

          if( move(game, x, y, game.turn) == 1 ) { // legal move
            
            // draw updated position
            drawBoard(game, board);

            // broadcast move to opponent
            socket.emit('move', { x: x, y: y, color: game.turn, gameId: serverGame.id, game: game });
          }
        } else {
          alert("not your turn");
        }

        //console.log(new WGo.Goban(19));

      });


      board.addEventListener('mousemove', function(x, y) {

        // check if it's your move
        if(( game.turn == -1 && username == serverGame.users.white ) ||
           ( game.turn == 1 && username == serverGame.users.black) ) {
  
          if(x == -1 || y == -1 || (x == lastX && y == lastY))
            return;

          // clear previous hover if there was one
          if( lastHover && game.getStone(lastX,lastY) == 0 )  {
            board.removeObjectsAt(lastX,lastY);
          }

          // add stone if no stone legally placed there in current game 
          if( game.getStone(x,y) == 0 ) {
            board.addObject([{x: x, y: y, c: game.turn}]);
            lastHover = true;
          }


          lastX = x;
          lastY = y;

        }

      });

      // clear hover if mouse leaves board
      board.addEventListener('mouseout', function(x, y) {
        if(lastHover && game.getStone(lastX,lastY) == 0) {
          board.removeObjectsAt(lastX,lastY);
        }

        lastHover = false;
      });
  

    }); // end WinJS.UI.processAll()
})();

