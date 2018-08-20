const model = require('../models/lobby_model.js');

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

// getSeeks should be accessible to all other functions within this controller
// so that it can be called from other handlers
function getSeeks(socket, db) {
  model.getSeeks(db, getSeeksHandler);

  function getSeeksHandler(result) {
    let seekArray = formatSeeks(result);
    socket.emit('getSeeksResponse', seekArray);
    socket.broadcast.emit('getSeeksResponse', seekArray);
  }
}

module.exports = {
  getSeeks,
  createSeek: function createSeek(socket, db, data) {
    model.addSeek(data, db, createSeekHandler);

    function createSeekHandler(result) {
      getSeeks(socket, db);
    }
  },
  deleteSeekByID: function deleteSeekByID(socket, db, seekID) {
    model.deleteSeekByID(seekID, db, deleteSeekByIDHandler);

    function deleteSeekByIDHandler(result) {
      getSeeks(socket, db);
    }
  },
  deleteSeeksByUserID: function deleteSeeksByUserID(socket, db, userID) {
    model.deleteSeeksByUserID(userID, db, deleteSeeksByUserIDHandler);

    function deleteSeeksByUserIDHandler(result) {
      getSeeks(socket, db);
    }
  },
  createNewGame: function createNewGame(socket, db, data) {
    model.insertGame(data, db, insertGameHandler);

    function insertGameHandler(result) {
      console.log('New game successfully created');
      // return new game id that gets auto generated from db
      // deleteSeeksByUserID(white)
      // deleteSeeksByUserID(black)
    }
  },
}
