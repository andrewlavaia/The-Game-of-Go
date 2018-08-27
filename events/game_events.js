const controller = require('../controllers/game_controller.js');

module.exports = function(socket, db) {
  socket.on('gameReady', (gameID) => {
    controller.loadGame(socket, db, gameID);
  });

  socket.on('moveRequest', (data) => {
    controller.submitMove(socket, db, data);
  });

  socket.on('move', (data) => {
    controller.move(socket, db, data);
  });

  socket.on('pauseTimer', () => {
    controller.pauseTimer(socket, db);
  });

  // ------------------------------------
  // This should be refactored. Timer should be set from db when game is launched.
  socket.on('invite', (data) => {
    controller.setTimer(socket, db, data);
  });
  // ------------------------------------

  socket.on('continue game', (data) => {   // !!! replace with joingame ?
    if (socket.username === data.userId) {
      console.log('continuing game : ' + data.gameId);
      socket.emit('continue game', data);
      socket.broadcast.emit('continue game', data);
    }
  });

  // when user places a stone on finalScoreBoard, we broadcast it to others
  socket.on('add stone to finalScoreBoard', (data) => {
    // only broadcast when user that made request is same on server
    if (socket.username === data.userId) {
      socket.broadcast.emit('add stone to finalScoreBoard', data);
      socket.broadcast.emit('unlock score', data);
    }
  });

  socket.on('lock score', (data) => {
    // only broadcast when user that made request is same on server
    if (socket.username === data.userId) {
      socket.emit('lock score', data);
      socket.broadcast.emit('lock score', data);
    }
  });
}


