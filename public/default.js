
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


      $('#calc-score').on('click', function() {
        calcScore_clickToggle = (calcScore_clickToggle === true) ? false : true;

        var position = game.getPosition();
        if(calcScore_clickToggle == true) {
          //drawScoreBoard(getAreaScoringPosition(position), board);
          //estimateScore(); // calls goScoreEstimator
          drawScoreBoardFromArray(estimateScore(), board, 19);
          
        } else {
          drawBoard(game, board);
        } 

      });


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

      //////////////////////////////
      // Go Score Estimator
      //////////////////////////////  

      var drawScoreBoard = function(position, board) {

        // clear board
        board.removeAllObjects();

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

      var drawScoreBoardFromArray = function(arr, board, boardSize) {

        // clear board
        // board.removeAllObjects();

        var blackCount = 0;
        var whiteCount = 0;

        // draw squares
        for(i=0; i < arr.length; i++) {
          if(arr[i] != 0) {
            var y = i % boardSize;
            var x = Math.floor(i / boardSize); // need to round down, otherwise it moves the stone one spot to the right 
                                                   // at certain sections of the board (bottom half).
                                                   // Math.floor is very slow so this may be a place to optimize down the road
            if(arr[i] == 1) {
              //board.addObject([{x: x, y: y, type: "SQ", c: WGo.B}]);
              board.addObject([{x: x, y: y, c: WGo.B}]);
              blackCount++;
            } else if(arr[i] == -1) {
              //board.addObject([{x: x, y: y, type: "SQ", c: WGo.W}]);
              board.addObject([{x: x, y: y, c: WGo.W}]);
              whiteCount++;
            }
          }
        }
      }; 


/*
      // No Longer Used
      var getAreaScoringPosition = function(pos) {
        var position = new WGo.Position(pos.size);
        position.color = pos.color;
        position.size = pos.size;
        position.capCount = {
          black: pos.capCount.black,
          white: pos.capCount.white
        };

        position.schema = getAreaScoringArray(pos);

        return position;
      };
      
      // No Longer Used
      var getAreaScoringArray = function(pos) {
        var positionArray = new Array(pos.schema.length);
        
        for(var i = 0; i < pos.schema.length; i++) {
          
          // !!! insert code here that grabs scoring vector from scoreestimator

          // debug
          positionArray[i] = 1;
        }

        return positionArray;

      };

      // No Longer Used
      var convertPositionArrayToVector = function(pos) {
        var vec = new Module.VectorInt;

        for(var i = 0; i < pos.schema.length; i++) { 
          vec.push_back(pos.schema[i]); 
        }

        return vec;

      };
*/

      var convertVectorToArray = function(vec) {
        var positionArray = new Array();
        var positionVector = new Module.VectorInt;
        positionVector = vec;

        for(var i = 0; i < positionVector.size(); i++) {
          positionArray.push(positionVector.get(i));
        }

        return positionArray;

      };

      var estimateScore = function() {
        var instance = new Module.Goban;
        var vec = new Module.VectorInt;
        
        for(var i = 0; i < 361; i++) { 
          vec.push_back(game.getPosition().schema[i]); 
        }
        
        instance.populateBoard(vec, 19);
        instance.print();
        console.log(instance.score());

        var instance2 = new Module.Goban;
        instance2 = instance.estimate(Module.Color.BLACK, 1000, .35); // !!! get current position color, change 1000 to 10000 once optimized
        instance2.print();
        console.log(instance2.score());

        var scoreVec = new Module.VectorInt;
        scoreVec = instance2.getScoreVector();
        console.log(scoreVec);

        var scoreArray = new Array();
        scoreArray = convertVectorToArray(scoreVec);
        console.log(scoreArray);

        return scoreArray;

      };

      board.addEventListener("click", function(x, y) {

        // check if area scoring board is shown
        if (calcScore_clickToggle == true)
          return;

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

        // check if area scoring board is shown
        if (calcScore_clickToggle == true)
          return;

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


      


