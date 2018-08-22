const mysql = require('mysql');

module.exports = {
  addSeek: function addSeek(data, db, addSeekHandler) {
    db.query(
      'INSERT INTO seekgames (userid, username, userrank, seconds, periods, timetype, israted) VALUES (' +
      mysql.escape(data.seekuserid) + ', ' + mysql.escape(data.seekusername) + ', ' +
      mysql.escape(data.seekuserrank) + ', ' + mysql.escape(data.time.seconds) + ', ' +
      mysql.escape(data.time.periods) + ', ' + mysql.escape(data.time.type) + ', ' +
      mysql.escape(data.isRated) + ')',
      addSeekHandler
    );
  },
  getSeeks: function getSeeks(db, getSeeksHandler) {
    db.query(
      'SELECT * FROM seekgames',
      getSeeksHandler
    );
  },
  deleteSeekByID: function deleteSeekByID(seekID, db, deleteSeekByIDHandler) {
    db.query(
      'DELETE FROM seekgames WHERE seekgameid = ' + mysql.escape(seekID),
      deleteSeekByIDHandler
    );
  },
  deleteSeeksByUserID(userID, db, deleteSeeksByUserIDHandler) {
    db.query(
      'DELETE FROM seekgames WHERE userid = ' + mysql.escape(userID),
      deleteSeekByIDHandler
    );
  },
  getUserGames: function getUserGames(userID, db, getUserGamesHandler) {
    db.query(
      'SELECT * FROM games WHERE (username_white = ' + mysql.escape(userID) +
      ' OR username_black = ' + mysql.escape(userID) + ')',
      getUserGamesHandler
    );
  },
  insertGame: function insertGame(game, db, insertGameHandler) {
    db.query(
      'INSERT INTO games (username_white, username_black, israted) VALUES (' +
      mysql.escape(game.users.white) + ', ' + mysql.escape(game.users.black) +
      ', ' + mysql.escape(game.isRated) + ')',
      insertGameHandler
    );
  },
  getGame: function getGame(gameID, db, getGameHandler) {
    db.query(
      'SELECT * FROM games WHERE gameid = ' + mysql.escape(gameID),
      getGameHandler
    );
  },
};


