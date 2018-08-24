const model = require('../models/game_model.js');
const utilityRatings = require('../utility/ratings.js');

function formatGameDB(row) {
  const game = {
    id: row.gameid,
    board: null,
    game: null,
    users: {
      white: row.username_white,
      whiteElo: 50,
      whiteRank: utilityRatings.convertRankToString(-17),
      black: row.username_black,
      blackElo: 100,
      blackRank: utilityRatings.convertRankToString(-18),
    },
    time: {
      type: 'Sudden Death', // types allowed: sudden_death, Japanese
      seconds: 60,
      periods: 0,
    },
    boardSize: 19, // 9, 13, or 19 are most common
    isRated: row.israted,
  }
  return game;
}

module.exports = {
  loadGame: function loadGame(socket, db, gameID) {
    model.getGame(gameID, db, getGameHandler);

    function getGameHandler(result) {
      let game = formatGameDB(result[0]);
      socket.emit('launchgame', {
        game,
      });
      socket.emit('launchChat', {
        game,
      });
      socket.broadcast.emit('launchgame', {
        game,
      });
      socket.broadcast.emit('launchChat', {
        game,
      });
    }
  },

  submitMove: function submitMove(socket, db, data) {
    model.gameMove(data, db, gameMoveHandler);

    function gameMoveHandler(result) {
      console.log("Move successfully updated");
    }
  },
}
