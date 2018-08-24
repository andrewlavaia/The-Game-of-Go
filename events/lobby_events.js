const controller = require('../controllers/lobby_controller.js');

module.exports = function(socket, db) {
  socket.on('createSeekRequest', (data) => {
    controller.createSeek(socket, db, data);
  });

  socket.on('getSeeksRequest', () => {
    controller.getSeeks(socket, db);
  });

  socket.on('acceptSeekRequest', (data) => {
    controller.acceptSeek(socket, db, data)
  });

  // TODO
  // add an acceptSeekRequest event
  // add a getActiveGamesRequest and return a list of games?
  // add a loadLobbyRequest which calls getActiveGames and getSeeks?

}
