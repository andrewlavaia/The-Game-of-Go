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

module.exports = function(socket, db) {
  socket.on('createSeekRequest', (data) => {
    model.addSeek(data, db, createSeekHandler);

    function createSeekHandler(result) {
      socket.emit('createSeekResponse', result);
      socket.broadcast.emit('createSeekResponse', result);
    }
  });

  socket.on('getSeeksRequest', () => {
    model.getSeeks(db, getSeeksHandler);

    function getSeeksHandler(result) {
      let seekArray = formatSeeks(result);
      socket.emit('getSeeksResponse', seekArray);
      socket.broadcast.emit('getSeeksResponse', seekArray);
    }
  });
}
