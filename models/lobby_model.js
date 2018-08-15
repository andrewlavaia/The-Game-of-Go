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
  getUserGames: function getUserGames(userid, db, getUserGamesHandler) {
    db.query(
      'SELECT * FROM games WHERE (username_white = ' + mysql.escape(userid) +
      ' OR username_black = ' + mysql.escape(userid) + ')',
      getUserGamesHandler
    );
  },
};


