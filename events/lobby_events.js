const controller = require('../controllers/lobby_controller.js');

module.exports = function(socket, db) {
  socket.on('createSeekRequest', (data) => {
    controller.createSeek(socket, db, data);
  });

  socket.on('getSeeksRequest', () => {
    controller.getSeeks(socket, db);
  });
}
