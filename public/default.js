
(function () {
    
    WinJS.UI.processAll().then(function () {
      
      var socket, serverGame;
      var username, playerColor;
      var game, board;
      var usersOnline = [];
      var myGames = [];
      socket = io();

           
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
            }            
      });
                  
      socket.on('joingame', function(msg) {
        console.log("joined as game id: " + msg.game.id );   
        playerColor = msg.color;
        initGame(msg.game);
        
        $('#page-lobby').hide();
        $('#page-game').show();
        
      });
        
      socket.on('move', function (msg) {
        if (serverGame && msg.gameId === serverGame.id) {
           game.move(msg.move);
           board.position(game.fen());
        }
      });


      socket.on('GOmove', function (msg) {
          console.log("coord: "+msg.coord + ", player: " + msg.coord + ", ko: " + msg.ko );   

            var play = jboard.playMove(msg.coord, msg.player, msg.ko);

            if(play.success) {

            node = jrecord.createNode(true);
            node.info.captures[player] += play.captures.length; // tally captures
            node.setType(msg.coord, msg.player); // play stone
            node.setType(play.captures, JGO.CLEAR); // clear opponent's stones

            if(lastMove)
              node.setMark(lastMove, JGO.MARK.NONE); // clear previous mark
            if(msg.ko)
              node.setMark(msg.ko, JGO.MARK.NONE); // clear previous ko mark

            node.setMark(coord, JGO.MARK.CIRCLE); // mark move
            lastMove = msg.coord;

            if(play.ko)
              node.setMark(play.ko, JGO.MARK.CIRCLE); // mark ko, too
            ko = play.ko;

            player = opponent;
            updateCaptures(node);

          } else alert('Illegal move: ' + play.errorMsg);
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
        $('#page-lobby').show();
      });
      
      $('#game-resign').on('click', function() {
        socket.emit('resign', {userId: username, gameId: serverGame.id});
        
        socket.emit('login', username);
        $('#page-game').hide();
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


           
      //////////////////////////////
      // Chess Game
      ////////////////////////////// 
      
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



      //////////////////////////////
      // Go Game
      ////////////////////////////// 

      var updateCaptures = function (node) {
        document.getElementById('black-captures').innerText = node.info.captures[JGO.BLACK];
        document.getElementById('white-captures').innerText = node.info.captures[JGO.WHITE];
      };
      var jrecord = new JGO.Record(19);
      var jboard = jrecord.jboard;
      var jsetup = new JGO.Setup(jboard, JGO.BOARD.largeWalnut);
      var player = JGO.WHITE; // next player
      var ko = false, lastMove = false; // ko coordinate and last move coordinate
      var lastHover = false, lastX = -1, lastY = -1; // hover helper vars

      jboard.setType(JGO.util.getHandicapCoordinates(jboard.width, 2), JGO.BLACK);

      jsetup.setOptions({stars: {points:5}});


      jsetup.create('board', function(canvas) {

        //serverGame = serverGameState;

        canvas.addListener('click', function(coord, ev) {
          var opponent = (player == JGO.BLACK) ? JGO.WHITE : JGO.BLACK;

          if(ev.shiftKey) { // on shift do edit
            if(jboard.getMark(coord) == JGO.MARK.NONE)
              jboard.setMark(coord, JGO.MARK.SELECTED);
            else
              jboard.setMark(coord, JGO.MARK.NONE);

            return;
          }

          // clear hover away - it'll be replaced or then it will be an illegal move
          // in any case so no need to worry about putting it back afterwards
          if(lastHover)
            jboard.setType(new JGO.Coordinate(lastX, lastY), JGO.CLEAR);

          lastHover = false;

          var play = jboard.playMove(coord, player, ko);

          if(play.success) {

            // broadcast move to opponent
            socket.emit('GOmove', {GOcoord: coord, GOplayer: player, GOko: ko});

            node = jrecord.createNode(true);
            node.info.captures[player] += play.captures.length; // tally captures
            node.setType(coord, player); // play stone
            node.setType(play.captures, JGO.CLEAR); // clear opponent's stones

            if(lastMove)
              node.setMark(lastMove, JGO.MARK.NONE); // clear previous mark
            if(ko)
              node.setMark(ko, JGO.MARK.NONE); // clear previous ko mark

            node.setMark(coord, JGO.MARK.CIRCLE); // mark move
            lastMove = coord;

            if(play.ko)
              node.setMark(play.ko, JGO.MARK.CIRCLE); // mark ko, too
            ko = play.ko;

            player = opponent;
            updateCaptures(node);

          } else alert('Illegal move: ' + play.errorMsg);
        });

        canvas.addListener('mousemove', function(coord, ev) {
          if(coord.i == -1 || coord.j == -1 || (coord.i == lastX && coord.j == lastY))
            return;

          if(lastHover) // clear previous hover if there was one
            jboard.setType(new JGO.Coordinate(lastX, lastY), JGO.CLEAR);

          lastX = coord.i;
          lastY = coord.j;

          if(jboard.getType(coord) == JGO.CLEAR && jboard.getMark(coord) == JGO.MARK.NONE) {
            jboard.setType(coord, player == JGO.WHITE ? JGO.DIM_WHITE : JGO.DIM_BLACK);
            lastHover = true;
          } else
            lastHover = false;
        });

        canvas.addListener('mouseout', function(ev) {
          if(lastHover)
            jboard.setType(new JGO.Coordinate(lastX, lastY), JGO.CLEAR);

          lastHover = false;
        });
      });

    });
})();

