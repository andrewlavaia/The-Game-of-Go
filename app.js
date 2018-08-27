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

// socket.io functions
io.on('connection', (socket) => {
  console.log('new socket connection - logged in as ' + socket.request.user.username);

  lobbyEvents(socket, db);
  gameResultEvents(socket, db);
  chatEvents(socket);
  utilityEvents(socket);
  gameEvents(socket, db);
});

http.listen(port, () => {
  console.log('listening on *: ' + port);
});
