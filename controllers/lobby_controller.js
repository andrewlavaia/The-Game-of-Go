const model = require('../models/lobby_model.js');
const utilityRatings = require('../utility/ratings.js');

function formatSeeks(seeks) {
  let seekArray =
    [
      ['Time', 'Rank', 'TimeType', 'Seconds', 'Periods', 'SeekID', 'Username', 'isRated',
        'BoardSize', 'Komi', 'Handicap'],
    ];
  let seekRow = [];
  for (let i = 0; i < seeks.length; i++) {
    seekRow.push(parseInt((seeks[i].seconds / 60) * (seeks[i].periods + 1), 10));
    seekRow.push(parseInt(seeks[i].userrank, 10));
    seekRow.push(seeks[i].timetype);
    seekRow.push(seeks[i].seconds);
    seekRow.push(seeks[i].periods);
    seekRow.push(seeks[i].seekgameid);
    seekRow.push(seeks[i].username);
    seekRow.push(seeks[i].israted);
    seekRow.push(seeks[i].boardsize);
    seekRow.push(seeks[i].komi);
    seekRow.push(seeks[i].handicap);
    seekArray.push(seekRow);
    seekRow = [];
  }
  return seekArray;
}

function formatGame(socket, data) {
  const game = {
    board: null,
    game: null,
    users: {
      white: socket.request.user.username,
      whiteElo: socket.request.user.userrank,
      whiteRank: utilityRatings.convertRankToString(socket.request.user.userrank),
      black: data.opponentId,
      blackElo: data.opponentRank,
      blackRank: utilityRatings.convertRankToString(data.opponentRank),
    },
    time: {
      type: data.time.type, // types allowed: sudden_death, Japanese
      seconds: data.time.seconds,
      periods: data.time.periods,
    },
    boardSize: 19, // 9, 13, or 19 are most common
    isRated: data.isRated,
  }
  return game;
}

let self = module.exports = {
  getSeeks: function getSeeks(socket, db) {
    model.getSeeks(db, getSeeksHandler);

    function getSeeksHandler(result) {
      let seekArray = formatSeeks(result);
      socket.emit('getSeeksResponse', seekArray);
      socket.broadcast.emit('getSeeksResponse', seekArray);
    }
  },
  createSeek: function createSeek(socket, db, data) {
    model.addSeek(data, db, createSeekHandler);

    function createSeekHandler(result) {
      self.getSeeks(socket, db);
    }
  },
  acceptSeek: function acceptSeek(socket, db, data) {
    self.createNewGame(socket, db, data);
    self.deleteSeeksByUserID(socket, db, socket.request.user.username);
    self.deleteSeeksByUserID(socket, db, data.opponentId);
  },
  deleteSeekByID: function deleteSeekByID(socket, db, seekID) {
    model.deleteSeekByID(seekID, db, deleteSeekByIDHandler);

    function deleteSeekByIDHandler(result) {
      self.getSeeks(socket, db);
    }
  },
  deleteSeeksByUserID: function deleteSeeksByUserID(socket, db, userID) {
    model.deleteSeeksByUserID(userID, db, deleteSeeksByUserIDHandler);

    function deleteSeeksByUserIDHandler(result) {
      console.log("seeks deleted");
      self.getSeeks(socket, db);
    }
  },
  createNewGame: function createNewGame(socket, db, data) {
    let game = formatGame(socket, data);
    model.insertGame(game, db, insertGameHandler);

    function insertGameHandler(result) {
      console.log('New game successfully created');
      socket.emit('joingame', {
        gameID: result.insertId,
      });
      socket.broadcast.emit('joingame', {
        gameID: result.insertId,
      });
    }

    return game; // remove this once lobby is sorted out
  },
}
