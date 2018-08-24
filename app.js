const express = require('express');
const app = express();

// general use libraries
const path = require('path');
const assert = require('assert');

// handlebars dependencies and initialization
const hbs = require('express-handlebars');
app.engine('hbs', hbs({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '/views/layouts/'),
  partialsDir: path.join(__dirname, '/views/partials/'),
}));
app.set('view engine', 'hbs');

// MySQL and passport login dependencies
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
  extended: true, // support parsing of application/x-www-form-urlencoded post data
}));
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

// load database
const DB = require('./config/database.js');
const db = new DB();

// socket events
const lobbyEvents = require('./events/lobby_events.js');
const gameResultEvents = require('./events/game_result_events.js');
const chatEvents = require('./events/chat_events.js');
const utilityEvents = require('./events/utility_events.js');
const gameEvents = require('./events/game_events.js');

// controllers
const gameResultController = require('./controllers/game_result_controller.js');
const lobbyController = require('./controllers/lobby_controller.js');

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
  gameEvents(socket, db);

  socket.on('invite', (data) => {
    seconds = data.time.seconds;
    periods = data.time.periods;
    timer_black = data.time.seconds;
    timer_white = data.time.seconds;
    periods_black = data.time.periods;
    periods_white = data.time.periods;
    timer_type = data.time.type;
  });

  socket.on('move', (msg) => {
    if (msg.pass === false) {
      socket.broadcast.emit('move', msg);
    } else {
      socket.broadcast.emit('pass', msg);
    }

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

      console.log('Resigning game : ' + msg.gameId);

      // add result to Game Results table and delete active game
      //processGameResult(msg.gameId, msg.userId, msg.WGoGame, 'Resignation', 0, 0);
      clearInterval(intervalID);

      socket.emit('resign', msg);
      socket.broadcast.emit('resign', msg); // let other player know his opponent resigned
    }
  });

  // !!! replace with joingame ?
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
