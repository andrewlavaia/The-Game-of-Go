const controller = require('../controllers/game_controller.js');

module.exports = function(socket, db) {
  socket.on('moveRequest', (data) => {
    controller.submitMove(socket, db, data);
  });
}


