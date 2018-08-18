const controller = require('../controllers/game_result_controller.js');

module.exports = function(socket, db) {
  socket.on('resignRequest', (data) => {
    if (socket.username === data.userId) {
      // game_events.endGame(); -> !!! develop
      // stop timer, etc
      controller.processGameResult(socket, db, data, 'Resignation', data.userId);
    }
  });
}
