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
const dbconfig = require('./config/dbconfig.js');
const sessionStore = new MySQLStore(dbconfig.options);

// required for passport
app.use(session({
  key: dbconfig.session_key,
  secret: dbconfig.session_secret,
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

io.use(passportSocketIo.authorize({
  key: dbconfig.session_key,
  secret: dbconfig.session_secret,
  store: sessionStore,
  passport, // shorthand for passport: passport,
  cookieParser, // shorthand for cookieParser: cookieParser,
  success: function onAuthorizeSuccess(data, accept) {
    console.log('Connection successful - user authenticated');
    accept();
  },
  fail: function onAuthorizeFail() {
    console.log('Connection rejected - user not authorized');
  },
}));

// connect passport to database
require('./config/passport')(passport);

// send app to router
require('./router.js')(app, passport);

// utility functions
const utilityRatings = require('./utility/ratings.js');

// Load database
const DB = require('./config/database.js');
const db = new DB();

// socket events
const lobbyEvents = require('./events/lobby_events.js');
const gameResultEvents = require('./events/game_result_events.js');
const chatEvents = require('./events/chat_events.js');
const utilityEvents = require('./events/utility_events.js');

// controllers
const gameResultController = require('./controllers/game_result_controller.js');
const lobbyController = require('./controllers/lobby_controller.js');

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

// socket.io functions
io.on('connection', (socket) => {
  console.log('new socket connection - logged in as ' + socket.request.user.username);

  lobbyEvents(socket, db);
  gameResultEvents(socket, db);
  chatEvents(socket);
  utilityEvents(socket);

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

    const game = lobbyController.createNewGame(socket, db, data);

    seconds = game.time.seconds;
    periods = game.time.periods;
    timer_black = game.time.seconds;
    timer_white = game.time.seconds;
    periods_black = game.time.periods;
    periods_white = game.time.periods;
    timer_type = game.time.type;

    // socket.gameId = game.id;
    // activeGames[game.id] = game;

    // users[game.users.white].games[game.id] = game.id;
    // users[game.users.black].games[game.id] = game.id;

    // console.log('starting game: ' + game.id);
    // lobbyUsers[game.users.white].emit('joingame', {
    //   game, // shorthand for game: game,
    //   color: 'white',
    // });
    // lobbyUsers[game.users.black].emit('joingame', {
    //   game, // shorthand for game: game,
    //   color: 'black',
    // });

    // delete all other seeks from these users when they join the game

    delete lobbyUsers[game.users.white];
    delete lobbyUsers[game.users.black];

    if (data.seekId) {
      lobbyController.deleteSeekByID(socket, db, data.seekId);
    }
  });

  // socket.on('gameReady', (gameId) => {
  //   // if (activeGames[gameId]) {
  //     socket.gameId = gameId;
  //     const game = activeGames[gameId];

  //     if (lobbyUsers[socket.request.user.username]) {
  //       socket.emit('launchgame', {
  //         game, // shorthand for game: game,
  //       });
  //       delete lobbyUsers[socket.request.user.username];
  //       socket.emit('launchChat', {
  //         game,
  //       });
  //     }
  //   // } else {
  //   //   socket.emit('gameNotFound');
  //   // }
  // });


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
    //activeGames[msg.gameId].game = msg.game;

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
        gameResultController.processGameResult(socket, db, msg, 'Time Loss', msg.blackUser);
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
        gameResultController.processGameResult(socket, db, msg, 'Time Loss', msg.whiteUser);
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
      //processGameResult(msg.gameId, msg.userId, msg.WGoGame, 'Resignation', 0, 0);
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
      gameResultController.processGameResult(socket, db, msg, 'Score', loserID);
      //processGameResult(msg.gameId, loserID, msg.WGoGame, 'Score', msg.whiteScore, msg.blackScore);
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
    // echo globally that this client has left chat
    socket.broadcast.emit('user left', {
      username: socket.username,
      // numUsers: numUsers,
      gameid: socket.gameId,
    });
  });
});


http.listen(port, () => {
  console.log('listening on *: ' + port);
});
