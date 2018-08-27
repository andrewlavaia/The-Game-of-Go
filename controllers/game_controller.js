const model = require('../models/game_model.js');
const gameResultController = require('../controllers/game_result_controller.js');
const utilityRatings = require('../utility/ratings.js');

// go board timer variables
let seconds;
let periods;
let timer_black;
let timer_white;
let periods_black
let periods_white;
let timer_type;
let intervalID;

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

  setTimer: function setTimer(socket, db, data) {
    seconds = data.time.seconds;
    periods = data.time.periods;
    timer_black = data.time.seconds;
    timer_white = data.time.seconds;
    periods_black = data.time.periods;
    periods_white = data.time.periods;
    timer_type = data.time.type;
  },

  pauseTimer: function pauseTimer(socket, db) {
    clearInterval(intervalID);
  },

  move: function move(socket, db, data) {
    if (data.pass === false) {
      socket.broadcast.emit('move', data);
    } else {
      socket.broadcast.emit('pass', data);
    }

    // potential security concern: should I look up users through MySQL
    // rather than trusting data.blackUser and data.white User

    // Update Board Game Timer
    if (intervalID !== undefined) {
      clearInterval(intervalID);
    }

    // reset seconds timer when timer type is "Japanese"
    // can also do when periods > 0 ?
    if (timer_type === 'Japanese') {
      timer_black = seconds;
      timer_white = seconds;
    }

    intervalID = setInterval(() => {
      if (data.game.turn === 1 && timer_black > 0) {
        timer_black--;
      } else if (data.game.turn === 1 && timer_black === 0 && periods_black > 0) {
        periods_black--;
        timer_black = seconds;
      } else if (data.game.turn === 1 && timer_black === 0 && periods_black === 0) {
        // console.log('Black loses on time');

        gameResultController.processGameResult(socket, db, data, 'Time Loss', data.blackUser);
        socket.emit('timeloss', {
          gameId: data.gameId,
          loser: data.blackUser,
        });
        socket.broadcast.emit('timeloss', {
          gameId: data.gameId,
          loser: data.blackUser,
        });

        clearInterval(intervalID);
      } else if (data.game.turn === -1 && timer_white > 0) {
        timer_white--;
      } else if (data.game.turn === -1 && timer_white === 0 && periods_white > 0) {
        periods_white--;
        timer_white = seconds;
      } else if (data.game.turn === -1 && timer_white === 0 && periods_white === 0) {

        gameResultController.processGameResult(socket, db, data, 'Time Loss', data.whiteUser);
        socket.emit('timeloss', {
          gameId: data.gameId,
          loser: data.whiteUser,
        });
        socket.broadcast.emit('timeloss', {
          gameId: data.gameId,
          loser: data.whiteUser,
        });
        clearInterval(intervalID);
      }

      // send to client
      socket.emit('timer', {
        seconds, // shorthand for seconds: seconds,
        periods,
        timer_white,
        timer_black,
        periods_black,
        periods_white,
        gameId: data.gameId,
      });

      // send to all other clients
      socket.broadcast.emit('timer', {
        seconds, // shorthand for seconds: seconds,
        periods,
        timer_white,
        timer_black,
        periods_black,
        periods_white,
        gameId: data.gameId,
      });
    }, 1000);
  },
}
