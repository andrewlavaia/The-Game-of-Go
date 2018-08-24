const controller = require('../controllers/game_result_controller.js');

module.exports = function(socket, db) {
  socket.on('resignRequest', (data) => {
    if (socket.username === data.userId) {
      // game_controller.endGame(); -> !!! develop
      // stop timer, etc
      controller.processGameResult(socket, db, data, 'Resignation', data.userId);
    }
  });

  socket.on('finalScoreRequest', (data) => {
    if (socket.username === data.userId) {
      if (data.blackScore === data.whiteScore) {
        controller.processGameResult(socket, db, data, 'No Result', data.userId);
      }
      else {
        const loserID = (data.blackScore > data.whiteScore ? data.whiteUser : data.blackUser);
        controller.processGameResult(socket, db, data, 'Score', data.userId);
      }
    }
  });
}
