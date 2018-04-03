const express = require('express');

const app = express();

// general use libraries
const path = require('path');
const assert = require('assert');

// Handlebars dependencies and initialization
const hbs = require('express-handlebars');

app.engine('hbs', hbs({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '/views/layouts/'),
  partialsDir: path.join(__dirname, '/views/partials/'),
}));
app.set('view engine', 'hbs');

// MySQL and Passport login dependencies
const mysql = require('mysql');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const passport = require('passport');
const flash = require('connect-flash');

// initialize express app
app.use(express.static('public_html')); // all files in public_html www folder should be static
app.use(bodyParser.json()); // support parsing of application/json type post data
app.use(bodyParser.urlencoded({
  extended: true,
})); // support parsing of application/x-www-form-urlencoded post data
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)

// sets up a session store with MySQL
const MySQLStore = require('express-mysql-session')(session);

const options = require('./config/options.js');
const sessionStore = new MySQLStore(options);

// required for passport
app.use(session({
  key: 'thegameofgokey.sid',
  secret: 'andrewlavaiatestsecret',
  store: sessionStore,
  resave: false, // don't create session until something stored
  saveUninitialized: false, // don't save session if unmodified
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// socket.io dependencies for multiplayer
const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 51234;

// passport.socketio middleware
const passportSocketIo = require('passport.socketio');

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept();
}

function onAuthorizeFail() {
  console.log('connection to socket.io rejected - user not authorized');
}

io.use(passportSocketIo.authorize({
  key: 'thegameofgokey.sid',
  secret: 'andrewlavaiatestsecret', // can also use: process.env.SECRET_KEY_BASE,
  store: sessionStore,
  passport, // shorthand for passport: passport,
  cookieParser, // shorthand for cookieParser: cookieParser,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail,
}));

// connect to database
require('./config/passport')(passport); // pass passport for configuration

// send app to router
require('./router.js')(app, passport);

// utility functions
const utilityRatings = require('./utility/ratings.js');

// Load database
const DB = require('./database.js');

const db = new DB();

// socket.io tracking variables
const lobbyUsers = {};
const users = {};
const activeGames = {};

// go board timer variables
let seconds;
let periods;
let timer_black;
let timer_white;
let periods_black;
let periods_white;
let timer_type;
let intervalID;

// chat variables
// let numUsers = 0;

/*
function getUserGames(userid) {
  db.query(
    'SELECT * FROM games WHERE (username_white = ' + mysql.escape(userid) +
    ' OR username_black = ' + mysql.escape(userid) + ')',
    (result, err) => {
      if (err) {
        throw new Error(err);
      }

      // sendUserGames(result); // sends the logged in users' games to client

      let i = 0;
      result.forEach(() => {
        console.log(result[i]);
        i++;
      });
    } // eslint-disable-line comma-dangle
  );
}
*/

function insertGameResult(gameID, whiteUser, blackUser, winningUser, endCondition, WGoGame, whiteScore, blackScore, isRated, dateStarted) {
  assert(endCondition === 'Time Loss' || endCondition === 'Resignation' ||
         endCondition === 'Score' || endCondition === 'No Result');
  const gameString = JSON.stringify(WGoGame);
  const winner = (endCondition !== 'No Result' ? winningUser : 'No Result');

  // console.log(gameString);
  db.query(
    'INSERT INTO gameresults (gameid, username_white, username_black, winner, gameend, game_array, whitescore, blackscore, israted, datestarted) VALUES (' +
    mysql.escape(gameID) + ', ' + mysql.escape(whiteUser) + ', ' +
    mysql.escape(blackUser) + ', ' + mysql.escape(winner) + ', ' +
    mysql.escape(endCondition) + ', ' + mysql.escape(gameString) + ', ' +
    mysql.escape(whiteScore) + ', ' + mysql.escape(blackScore) + ', ' +
    mysql.escape(isRated) + ', ' + mysql.escape(dateStarted) + ')',
    (result) => {
      // console.log(result);
    } // eslint-disable-line comma-dangle
  );
}

function deleteGame(gameID) {
  db.query(
    'DELETE FROM games WHERE gameid = ' + mysql.escape(gameID),
    (err, result) => {
      // console.log(result);
    } // eslint-disable-line comma-dangle
  );
}

function adjustUserRatings(gameID, winnerID, loserID, endCondition) {
  assert(endCondition === 'Time Loss' || endCondition === 'Resignation' ||
         endCondition === 'Score' || endCondition === 'No Result');

  db.query(
    'SELECT * FROM users WHERE username in (' +
      mysql.escape(winnerID) + ',' + mysql.escape(loserID) + ')',
    (result) => {
      assert(result.length === 2);
      let winner;
      let loser;
      if (result[0].username === winnerID) {
        winner = result[0];
        loser = result[1];
      } else {
        loser = result[0];
        winner = result[1];
      }

      // elo formula
      const k = 32; // k-factor

      assert(Math.pow(2, 4) === 2 * 2 * 2 * 2); // eslint-disable-line no-restricted-properties
      const r1 = Math.pow(10, (winner.elo / 400)); // eslint-disable-line no-restricted-properties
      const r2 = Math.pow(10, (loser.elo / 400)); // eslint-disable-line no-restricted-properties

      const e1 = r1 / (r1 + r2);
      const e2 = r2 / (r1 + r2);

      // set score multiplier (1 = win, 0 = loss, 0.5 = draw)
      let s1;
      let s2;
      if (endCondition !== 'No Result') {
        s1 = 1; // score multiplier (1 = win)
        s2 = 0; // score multiplier (0 = loss)
      } else {
        s1 = 0.5;
        s2 = 0.5;
      }

      let newEloWinner = winner.elo + (k * (s1 - e1));
      if (newEloWinner < 0) {
        newEloWinner = 0; // in case of a draw
      }
      let newEloLoser = loser.elo + (k * (s2 - e2));
      if (newEloLoser < 0) {
        newEloLoser = 0;
      }

      const newRankW = utilityRatings.convertEloToRank(newEloWinner);
      // const newRankStringW = utilityRatings.convertRankToString(newRankW);

      const newRankL = utilityRatings.convertEloToRank(newEloLoser);
      // const newRankStringL = utilityRatings.convertRankToString(newRankL);

      console.log('winner: ' + winner.elo + ' -> ' + newEloWinner);
      console.log('loser: ' + loser.elo + ' -> ' + newEloLoser);

      // Update users table with new ratings
      // Run two separate MySQL queries for performance reasons
      db.query(
        'UPDATE users SET ' +
        'elo = ' + mysql.escape(newEloWinner) + ', ' +
        'userrank = ' + mysql.escape(newRankW) + ' ' +
        'WHERE username = ' + mysql.escape(winnerID),
        (result) => {
          // console.log(result);
        } // eslint-disable-line comma-dangle
      );
      db.query(
        'UPDATE users SET ' +
        'elo = ' + mysql.escape(newEloLoser) + ', ' +
        'userrank = ' + mysql.escape(newRankL) + ' ' +
        'WHERE username = ' + mysql.escape(loserID),
        (result) => {
          // console.log(result);
        } // eslint-disable-line comma-dangle
      );

      // Add old rating and new rating to ratinghistory table
      db.query(
        'INSERT INTO ratinghistory (gameid, username, startingelo, endingelo) VALUES (' +
        mysql.escape(gameID) + ', ' + mysql.escape(winnerID) + ', ' +
        mysql.escape(winner.elo) + ', ' + mysql.escape(newEloWinner) + ')',
        (err, result) => {
          // console.log(result);
        } // eslint-disable-line comma-dangle
      );
      db.query(
        'INSERT INTO ratinghistory (gameid, username, startingelo, endingelo) VALUES (' +
        mysql.escape(gameID) + ', ' + mysql.escape(loserID) + ', ' +
        mysql.escape(loser.elo) + ', ' + mysql.escape(newEloLoser) + ')',
        (err, result) => {
          // console.log(result);
        } // eslint-disable-line comma-dangle
      );
    } // eslint-disable-line comma-dangle
  );
}

function processGameResult(gameID, loserID, WGoGame, endCondition, whiteScore, blackScore) {
  assert(endCondition === 'Time Loss' || endCondition === 'Resignation' ||
         endCondition === 'Score' || endCondition === 'No Result');
  db.query(
    'SELECT * FROM games WHERE gameid = ' + mysql.escape(gameID),
    (result) => {
      assert(gameID === result[0].gameid);
      const whiteUser = result[0].username_white;
      const blackUser = result[0].username_black;
      const isRated = result[0].israted;
      const dateStarted = result[0].datestarted;

      // set winningUser variable
      const winningUser = (loserID === whiteUser ? blackUser : whiteUser);

      if (isRated === 1) {
        adjustUserRatings(gameID, winningUser, loserID, endCondition);
      }

      insertGameResult(gameID, whiteUser, blackUser, winningUser, endCondition, WGoGame, whiteScore, blackScore, isRated, dateStarted);
      deleteGame(gameID);
    } // eslint-disable-line comma-dangle
  );
}

// socket.io functions
io.on('connection', (socket) => {
  console.log('new socket connection - logged in as ' + socket.request.user.username);

  let startTime = Date.now(); // used to check latency
  let addedUser = false; // used for game chat

  setInterval(() => {
    startTime = Date.now();
    socket.emit('ping');
  }, 3000); // check ping every three seconds

  function updateSeeks(socket) {
    const seekArray =
      [
        ['Time', 'Rank', 'TimeType', 'Seconds', 'Periods', 'SeekID', 'Username', 'isRated',
         'BoardSize', 'Komi', 'Handicap'],
      ];

    db.query('SELECT * FROM seekgames', (result) => {
      let seekRow = [];
      for (let i = 0; i < result.length; i++) {
        seekRow.push(parseInt((result[i].seconds / 60) * (result[i].periods + 1), 10));
        seekRow.push(parseInt(result[i].userrank, 10));
        seekRow.push(result[i].timetype);
        seekRow.push(result[i].seconds);
        seekRow.push(result[i].periods);
        seekRow.push(result[i].seekgameid);
        seekRow.push(result[i].username);
        seekRow.push(result[i].israted);
        seekRow.push(result[i].boardsize);
        seekRow.push(result[i].komi);
        seekRow.push(result[i].handicap);
        seekArray.push(seekRow);
        // console.log(seekArray);
        // console.log(result[i]);
        // console.log(seekRow + "-" + i);
        seekRow = [];
      }
      socket.emit('addSeeks', seekArray);
      socket.broadcast.emit('addSeeks', seekArray);
    });
  }

  function doLogin(socket, userId) {
    socket.userId = userId;

    if (!users[userId]) {
      console.log('creating new user');
      users[userId] = {
        userId: socket.userId,
        games: {},
      };
    } else {
      console.log('user found!');
      Object.keys(users[userId].games).forEach((gameId) => {
        console.log('available game: ' + gameId);
      });
    }

    socket.emit('updateLobby', {
      users: Object.keys(lobbyUsers),
      games: Object.keys(users[userId].games),
    });
    lobbyUsers[userId] = socket;

    socket.broadcast.emit('joinLobby', socket.userId);

    updateSeeks(socket);

    // getUserGames(socket.userId);
  }

  doLogin(socket, socket.request.user.username);

  socket.on('login', (userId) => {
    doLogin(socket, userId);
  });

  socket.on('invite', (data) => {
    console.log('got an invite from: ' + socket.userId + ' --> ' + data.opponentId);

    socket.broadcast.emit('leaveLobby', socket.userId);
    socket.broadcast.emit('leaveLobby', data.opponentId);

    const game = {
      id: Math.floor((Math.random() * 100000) + 1),
      board: null,
      game: null,
      users: {
        white: socket.userId,
        whiteRank: utilityRatings.convertRankToString(socket.request.user.userrank),
        black: data.opponentId,
        blackRank: utilityRatings.convertRankToString(data.opponentRank),
      },
      time: {
        type: data.time.type,
        seconds: data.time.seconds,
        periods: data.time.periods,
      }, // types include sudden_death and Japanese
      boardSize: 19, // 9, 13, or 19 are most common
    };

    seconds = game.time.seconds;
    periods = game.time.periods;
    timer_black = game.time.seconds;
    timer_white = game.time.seconds;
    periods_black = game.time.periods;
    periods_white = game.time.periods;
    timer_type = game.time.type;

    socket.gameId = game.id;
    activeGames[game.id] = game;

    users[game.users.white].games[game.id] = game.id;
    users[game.users.black].games[game.id] = game.id;

    console.log('starting game: ' + game.id);
    lobbyUsers[game.users.white].emit('joingame', {
      game, // shorthand for game: game,
      color: 'white',
    });
    lobbyUsers[game.users.black].emit('joingame', {
      game, // shorthand for game: game,
      color: 'black',
    });

    // delete all other seeks from these users when they join the game

    delete lobbyUsers[game.users.white];
    delete lobbyUsers[game.users.black];

    // add game to database
    // !!! if game.id is already taken, there will be a mysql error so it will need to change
    db.query(
      'INSERT INTO games (gameid, username_white, username_black, israted) VALUES (' +
      mysql.escape(game.id) + ', ' + mysql.escape(game.users.white) + ', ' +
      mysql.escape(game.users.black) + ', ' + mysql.escape(data.isRated) + ')',
      (err, result) => {
        // console.log(result);
      } // eslint-disable-line comma-dangle
    );

    if (data.seekId) {
      // delete seek from database
      db.query(
        'DELETE FROM seekgames WHERE seekgameid = ' + mysql.escape(data.seekId),
        (err, result) => {
          // console.log(result);
        } // eslint-disable-line comma-dangle
      );
      /*
      socket.emit('drawChart');
      socket.broadcast.emit('drawChart');
      */
    }
  });

  socket.on('gameReady', (gameId) => {
    if (activeGames[gameId]) {
      socket.gameId = gameId;
      const game = activeGames[gameId];

      if (lobbyUsers[socket.request.user.username]) {
        socket.emit('launchgame', {
          game, // shorthand for game: game,
        });
        delete lobbyUsers[socket.request.user.username];
        socket.emit('launchChat', {
          game,
        });
      }
    } else {
      socket.emit('gameNotFound');
    }
  });


  socket.on('resumegame', (gameId) => {
    console.log('ready to resume game: ' + gameId);

    socket.gameId = gameId;
    const game = activeGames[gameId];

    users[game.users.white].games[game.id] = game.id;
    users[game.users.black].games[game.id] = game.id;

    console.log('resuming game: ' + game.id);
    if (lobbyUsers[game.users.white]) {
      lobbyUsers[game.users.white].emit('joingame', {
        game, // shorthand for game: game,
        color: 'white',
      });
    }

    if (lobbyUsers[game.users.black]) {
      lobbyUsers[game.users.black].emit('joingame', {
        game, // shorthand for game: game,
        color: 'black',
      });
    }

    socket.broadcast.emit('leaveLobby', socket.userId);
  });

  socket.on('move', (msg) => {
    if (msg.pass === false) {
      socket.broadcast.emit('move', msg);
    } else {
      socket.broadcast.emit('pass', msg);
    }
    activeGames[msg.gameId].game = msg.game;

    // potential security concern: should I look up users through MySQL
    // rather than trusting msg.blackUser and msg.white User

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
      if (msg.game.turn === 1 && timer_black > 0) {
        timer_black--;
      } else if (msg.game.turn === 1 && timer_black === 0 && periods_black > 0) {
        periods_black--;
        timer_black = seconds;
      } else if (msg.game.turn === 1 && timer_black === 0 && periods_black === 0) {
        // console.log('Black loses on time');

        if (socket.username === msg.blackUser || socket.username === msg.whiteUser) {
          delete users[activeGames[msg.gameId].users.white].games[msg.gameId];
          delete users[activeGames[msg.gameId].users.black].games[msg.gameId];
          delete activeGames[msg.gameId];
        }
        processGameResult(msg.gameId, msg.blackUser, msg.game, 'Time Loss', 0, 0);
        socket.emit('timeloss', {
          gameId: msg.gameId,
          loser: msg.blackUser,
        });
        socket.broadcast.emit('timeloss', {
          gameId: msg.gameId,
          loser: msg.blackUser,
        });

        clearInterval(intervalID);
      } else if (msg.game.turn === -1 && timer_white > 0) {
        timer_white--;
      } else if (msg.game.turn === -1 && timer_white === 0 && periods_white > 0) {
        periods_white--;
        timer_white = seconds;
      } else if (msg.game.turn === -1 && timer_white === 0 && periods_white === 0) {
        // console.log('White loses on time');
        if (socket.username === msg.blackUser || socket.username === msg.whiteUser) {
          delete users[activeGames[msg.gameId].users.white].games[msg.gameId];
          delete users[activeGames[msg.gameId].users.black].games[msg.gameId];
          delete activeGames[msg.gameId];
        }
        processGameResult(msg.gameId, msg.whiteUser, msg.game, 'Time Loss', 0, 0);
        socket.emit('timeloss', {
          gameId: msg.gameId,
          loser: msg.whiteUser,
        });
        socket.broadcast.emit('timeloss', {
          gameId: msg.gameId,
          loser: msg.whiteUser,
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
        gameId: msg.gameId,
      });

      // send to all other clients
      socket.broadcast.emit('timer', {
        seconds, // shorthand for seconds: seconds,
        periods,
        timer_white,
        timer_black,
        periods_black,
        periods_white,
        gameId: msg.gameId,
      });
    }, 1000);
  });

  socket.on('resign', (msg) => {
    // confirm that the user that emitted the resign request is current user in socket
    if (socket.username === msg.userId) {
      delete users[activeGames[msg.gameId].users.white].games[msg.gameId];
      delete users[activeGames[msg.gameId].users.black].games[msg.gameId];
      delete activeGames[msg.gameId];

      console.log('Resigning game : ' + msg.gameId);

      // add result to Game Results table and delete active game
      processGameResult(msg.gameId, msg.userId, msg.WGoGame, 'Resignation', 0, 0);
      clearInterval(intervalID);

      socket.emit('resign', msg);
      socket.broadcast.emit('resign', msg); // let other player know his opponent resigned
    }
  });

  socket.on('resultbyscore', (msg) => {
    // confirm that the user that score request is current user in socket
    // and confirm that game still exists
    // (so no duplicate requests by player and opponent)
    assert(msg.whiteScore !== msg.blackScore);

    // clear timer interval for both players
    clearInterval(intervalID);

    // if game no longer exists, do nothing
    if (!activeGames[msg.gameId]) {
      return;
    }

    // if game still exists, delete it and submit result to database
    if (socket.username === msg.userId && activeGames[msg.gameId]) {
      delete users[activeGames[msg.gameId].users.white].games[msg.gameId];
      delete users[activeGames[msg.gameId].users.black].games[msg.gameId];
      delete activeGames[msg.gameId];

      console.log('Game decided by score : ' + msg.gameId);

      // determine which user lost based on score
      const loserID = (msg.blackScore > msg.whiteScore ? msg.whiteUser : msg.blackUser);

      // add result to Game Results table and delete active game
      processGameResult(msg.gameId, loserID, msg.WGoGame, 'Score', msg.whiteScore, msg.blackScore);
    }
  });

  socket.on('continue game', (msg) => {
    if (socket.username === msg.userId) {
      console.log('continuing game : ' + msg.gameId);
      socket.emit('continue game', msg);
      socket.broadcast.emit('continue game', msg);
    }
  });

  // when user places a stone on finalScoreBoard, we broadcast it to others
  socket.on('add stone to finalScoreBoard', (msg) => {
    // only broadcast when user that made request is same on server
    if (socket.username === msg.userId) {
      socket.broadcast.emit('add stone to finalScoreBoard', msg);
      socket.broadcast.emit('unlock score', msg);
    }
  });

  // when user places a stone on finalScoreBoard, we broadcast it to others
  socket.on('lock score', (msg) => {
    // only broadcast when user that made request is same on server
    if (socket.username === msg.userId) {
      socket.emit('lock score', msg);
      socket.broadcast.emit('lock score', msg);
    }
  });


  socket.on('pauseTimer', () => {
    clearInterval(intervalID);
  });

  socket.on('createSeek', (data) => {
    db.query(
      'INSERT INTO seekgames (userid, username, userrank, seconds, periods, timetype, israted) VALUES (' +
      mysql.escape(data.seekuserid) + ', ' + mysql.escape(data.seekusername) + ', ' +
      mysql.escape(data.seekuserrank) + ', ' + mysql.escape(data.time.seconds) + ', ' +
      mysql.escape(data.time.periods) + ', ' + mysql.escape(data.time.type) + ', ' +
      mysql.escape(data.isRated) + ')',
      (err, result) => {
        // console.log(result);
      } // eslint-disable-line comma-dangle
    );
    updateSeeks(socket);
    // doLogin(socket, socket.request.user.username);
    console.log('Seek Added');
    // socket.emit('drawChart');
    // socket.broadcast.emit('drawChart');
    // console.log(data);
  });

  socket.on('disconnect', (msg) => {
    console.log(msg);

    if (socket && socket.userId && socket.gameId) {
      console.log(socket.userId + ' disconnected');
      console.log(socket.gameId + ' disconnected');
    }

    delete lobbyUsers[socket.userId];

    socket.broadcast.emit('logout', {
      userId: socket.userId,
      gameId: socket.gameId,
    });

    // Game chat functionality
    if (addedUser) {
      // --numUsers;

      // echo globally that this client has left chat
      socket.broadcast.emit('user left', {
        username: socket.username,
        // numUsers: numUsers,
        gameid: socket.gameId,
      });
    }
  });

  // Latency Check
  socket.on('reportPing', () => {
    const latency = Date.now() - startTime;
    // send ping to client
    socket.emit('sendPing', {
      ping: latency,
      userId: socket.userId,
    });

    // send ping to opponent
    socket.broadcast.emit('sendPing', {
      ping: latency,
      userId: socket.userId,
    });
  });

  // --------------------------
  // Game Chat
  // --------------------------

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data.message,
      gameid: data.gameid,
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (data) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = data.username;
    // ++numUsers;
    addedUser = true;
    socket.emit('login', {
      // numUsers: numUsers,
      gameid: data.gameid,
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      // numUsers: numUsers,
      gameid: data.gameid,
    });
  });

  socket.on('leave chat', (data) => {
    socket.broadcast.emit('user left', {
      username: socket.username,
      gameid: data.gameId,
    });
  });


  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', (data) => {
    // only broadcast when user is the same on server
    if (socket.username === data.username) {
      socket.broadcast.emit('typing', {
        username: socket.username,
        gameid: data.gameid,
      });
    }
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', (data) => {
    // only broadcast when user is the same on server
    if (socket.username === data.username) {
      socket.broadcast.emit('stop typing', {
        username: socket.username,
        gameid: data.gameid,
      });
    }
  });
});


http.listen(port, () => {
  console.log('listening on *: ' + port);
});