const mysql = require('mysql');

module.exports = {
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


