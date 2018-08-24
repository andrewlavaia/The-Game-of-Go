const controller = require('../controllers/game_controller.js');

module.exports = function(socket, db) {
  socket.on('gameReady', (gameID) => {
    controller.loadGame(socket, db, gameID);
  });

  socket.on('moveRequest', (data) => {
    controller.submitMove(socket, db, data);
  });
}


