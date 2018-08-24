const mysql = require('mysql');

module.exports = {
  getGame: function getGame(gameID, db, getGameHandler) {
    db.query(
      'SELECT * FROM games WHERE gameid = ' + mysql.escape(gameID),
      getGameHandler
    );
  },

  gameMove: function gameMove(data, db, gameMoveHandler) {
    let gameString = JSON.stringify(data.game);
    db.query(
      'UPDATE games SET ' +
          'game_array = ' + mysql.escape(gameString) +
          'WHERE gameid = ' + mysql.escape(data.gameID),
      gameMoveHandler
    );
  },
};


