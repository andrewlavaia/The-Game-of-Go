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
  getGame: function getGame(gameID, db, getGameHandler) {
    db.query(
      'SELECT * FROM games WHERE gameid = ' + mysql.escape(gameID),
      getGameHandler
    );
  },
  deleteGame: function deleteGame(gameID, db, deleteGameHandler) {
    db.query(
      'DELETE FROM games WHERE gameid = ' + mysql.escape(gameID),
      deleteGameHandler
    );
  },
  getUsers: function getUsers(gameResult, db, getUsersHandler) {
    db.query(
      'SELECT * FROM users WHERE username in (' +
          mysql.escape(gameResult.winner) + ',' +
          mysql.escape(gameResult.loser) + ')',
      getUsersHandler
    );
  },
  updateRating: function updateRating(rankUpdate, db, updateRatingHandler) {
    db.query(
      'UPDATE users SET ' +
          'elo = ' + mysql.escape(rankUpdate.newElo) + ', ' +
          'userrank = ' + mysql.escape(rankUpdate.rank) + ' ' +
          'WHERE username = ' + mysql.escape(rankUpdate.userID),
      updateRatingHandler
    );
  },
  updateRatingHistory: function updateRatingHistory(rankUpdate, db, updateRatingHistoryHandler) {
    db.query(
      'INSERT INTO ratinghistory (gameid, username, startingelo, endingelo) VALUES (' +
      mysql.escape(rankUpdate.gameID) + ', ' + mysql.escape(rankUpdate.userID) + ', ' +
      mysql.escape(rankUpdate.oldElo) + ', ' + mysql.escape(rankUpdate.newElo) + ')',
      updateRatingHistoryHandler
    );
  }
};


