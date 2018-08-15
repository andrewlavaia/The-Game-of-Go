const mysql = require('mysql');

module.exports = {
  insertGameResult: function insertGameResult(gameResult, db, insertGameResultHandler) {
    db.query(
      'INSERT INTO gameresults (gameid, username_white, username_black, winner, gameend, game_array, whitescore, blackscore, israted, datestarted) VALUES (' +
      mysql.escape(gameResult.gameID) + ', ' + mysql.escape(gameResult.whiteUser) + ', ' +
      mysql.escape(gameResult.blackUser) + ', ' + mysql.escape(gameResult.winner) + ', ' +
      mysql.escape(gameResult.endCondition) + ', ' + mysql.escape(gameResult.gameString) + ', ' +
      mysql.escape(gameResult.whiteScore) + ', ' + mysql.escape(gameResult.blackScore) + ', ' +
      mysql.escape(gameResult.isRated) + ', ' + mysql.escape(gameResult.dateStarted) + ')',
      insertGameResultHandler
    );
  },
  getGame: function getGame(gameId, db, getGameHandler) {
    db.query(
      'SELECT * FROM games WHERE gameid = ' + mysql.escape(gameID),
      getGameHandler
    );
  },
};


