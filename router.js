module.exports = function(app, passport){

	// Home Page
	app.get('/', function(req,res){

		if(req.user) {
			console.log("Passport - logged in as " + req.user.username);
			res.render('home', {
				pageTitle : 'Home',
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
			});
		}
		else {
			console.log("Passport - user not logged in");
			res.render('home', {
				pageTitle : 'Home'
			});
		}

	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', isNotLoggedIn,  function(req,res){

		var loginMessage = req.flash('loginMessage');
    // console.log(loginMessage);

		// render the page and pass in any flash data if it exists
		res.render('login', {
			pageTitle : 'Login',
			loginMessage,
		});
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
      successRedirect : '/profile', // redirect to the secure profile section
      failureRedirect : '/login', // redirect back to the login page if there is an error
      failureFlash : true, // allow flash messages
		}),
      function(req, res) {
        if (req.body.remember) {
          req.session.cookie.maxAge = 1000 * 60 * 3;
        } else {
          req.session.cookie.expires = false;
        }
      res.redirect('/');
    });


	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', isNotLoggedIn, function(req, res) {

		var signupMessage = req.flash('signupMessage');

		// render the page and pass in any flash data if it exists
		res.render('signup', {
			pageTitle : 'Register',
			signupMessage
		});
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res) {
		res.render('profile', {
			pageTitle : 'Profile',
			userid : req.user.userid, // get the user out of session and pass to template
			username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring,
      datejoined: req.user.datejoined,
		});
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	// =====================================
	// PLAY - GAME LOBBY ===================
	// =====================================
	app.get('/gamelobby', isLoggedIn, function(req, res) {
		res.render('gamelobby', {
			pageTitle : 'Live Game Lobby',
			includeGoScripts : 'true', // required to load go scripts in page
			userid : req.user.userid,
			username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});

  // =====================================
  // PLAY - GAME =========================
  // =====================================
  app.get('/games*', isLoggedIn, function(req, res) {
    res.render('game', {
      pageTitle : 'Live Game',
      includeGoScripts : 'true', // required to load go scripts in page
      includeGameLogic : 'true', // required to play a game
      userid : req.user.userid,
      username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
    });
  });

	// =====================================
	// PLAY - TURN BASED ===================
	// =====================================
	app.get('/play_turnbased', isLoggedIn, function(req, res) {
		res.render('play_turnbased', {
			pageTitle : 'Turn Based Game Lobby',
			includeGoScripts : 'true', // required to load go scripts in page
			userid : req.user.userid,
			username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});

	// =====================================
	// PLAY - COMPUTER =====================
	// =====================================
	app.get('/play_computer', isLoggedIn, function(req, res) {
		res.render('play_computer', {
			pageTitle : 'Play Computer',
			includeGoScripts : 'true', // required to load go scripts in page
			userid : req.user.userid,
			username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});


	// =====================================
	// LEARN - INTRODUCTION ================
	// =====================================
	app.get('/learn_intro', function(req, res) {

		if(req.user) {
			res.render('learn_intro', {
				pageTitle : 'Introduction to Go',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_intro', {
				pageTitle : 'Introduction to Go',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// LEARN - BASICS ======================
	// =====================================
	app.get('/learn_basics', function(req, res) {
		if(req.user) {
			res.render('learn_basics', {
				pageTitle : 'Basics',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_basics', {
				pageTitle : 'Basics',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// LEARN - ADVANCED ====================
	// =====================================
	app.get('/learn_advanced', function(req, res) {
		if(req.user) {
			res.render('learn_advanced', {
				pageTitle : 'Advanced Rules',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_advanced', {
				pageTitle : 'Advanced Rules',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// LEARN - SCORING ================
	// =====================================
	app.get('/learn_scoring', function(req, res) {
		if(req.user) {
			res.render('learn_scoring', {
				pageTitle : 'How to Score a Game',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_scoring', {
				pageTitle : 'How to Score a Game',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// LEARN - HANDICAPPING ================
	// =====================================
	app.get('/learn_handicapping', function(req, res) {
		if(req.user) {
			res.render('learn_handicapping', {
				pageTitle : 'Handicapping',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_handicapping', {
				pageTitle : 'Handicapping',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// LEARN - RANKS =======================
	// =====================================
	app.get('/learn_ranks', function(req, res) {
		if(req.user) {
			res.render('learn_ranks', {
				pageTitle : 'Ranks Explained',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_ranks', {
				pageTitle : 'Ranks Explained',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// LEARN - LESSONS =====================
	// =====================================
	app.get('/learn_lessons', function(req, res) {
		if(req.user) {
			res.render('learn_lessons', {
				pageTitle : 'Lessons',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_lessons', {
				pageTitle : 'Lessons',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// LEARN - OPENINGS ====================
	// =====================================
	app.get('/learn_openings', function(req, res) {
		if(req.user) {
			res.render('learn_openings', {
				pageTitle : 'Openings',
        includeGoScripts : 'true', // required to load go scripts in page
				username : req.user.username,
        userid : req.user.userid,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		} else {
			res.render('learn_openings', {
				pageTitle : 'Openings',
        includeGoScripts : 'true', // required to load go scripts in page
			});
		}
	});

	// =====================================
	// WATCH - LIVE ========================
	// =====================================
	app.get('/watch_live', isLoggedIn, function(req, res) {
		res.render('watch_live', {
			pageTitle : 'Watch Live Games',
			includeGoScripts : 'true', // required to load go scripts in page
			userid : req.user.userid,
			username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});

	// =====================================
	// WATCH - ANNOTATED GAMES =============
	// =====================================
	app.get('/watch_annotated', isLoggedIn, function(req, res) {
		res.render('watch_annotated', {
			pageTitle : 'Watch Annotated Game Videos',
			includeGoScripts : 'true', // required to load go scripts in page
      userid : req.user.userid,
      username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});

	// =====================================
	// WATCH - EVENT COVERAGE ==============
	// =====================================
	app.get('/watch_event', isLoggedIn, function(req, res) {
		res.render('watch_event', {
			pageTitle : 'Event Coverage',
			includeGoScripts : 'true', // required to load go scripts in page
      userid : req.user.userid,
      username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});

	// =====================================
	// DISCUSS - FORUMS ====================
	// =====================================
	app.get('/discuss_forums', isLoggedIn, function(req, res) {
		res.render('discuss_forums', {
			pageTitle : 'Forums',
			includeGoScripts : 'true', // required to load go scripts in page
      userid : req.user.userid,
      username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});

	// =====================================
	// DISCUSS - GROUPS ====================
	// =====================================
	app.get('/discuss_groups', isLoggedIn, function(req, res) {
		res.render('discuss_groups', {
			pageTitle : 'Groups',
			includeGoScripts : 'true', // required to load go scripts in page
      userid : req.user.userid,
      username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});

	// =====================================
	// DISCUSS - MEMBERS ===================
	// =====================================
	app.get('/discuss_members', isLoggedIn, function(req, res) {
		res.render('discuss_members', {
			pageTitle : 'Members',
			includeGoScripts : 'true', // required to load go scripts in page
      userid : req.user.userid,
      username : req.user.username,
      userrank : req.user.userrank,
      userrankstring : req.user.userrankstring
		});
	});


	// =====================================
	// 404 Error - Page Not Found ==========
	// =====================================

	app.use(function(req,res){ // needs to be last route since it's a catch all
		res.status(404);

		if(req.user) {
			res.render('404', {
				pageTitle : 'Oops - Page Not Found', // needed for every page
        userid : req.user.userid,
        username : req.user.username,
        userrank : req.user.userrank,
        userrankstring : req.user.userrankstring
			});
		}
		else {
			res.render('404');
		}
	});
};

// route middleware to check if user is logged in
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	console.log("user is not logged in");

	// if they aren't redirect them to the Login page
	res.redirect('/login');
};

// route middleware to check if user is not logged in (for login page redirect)
function isNotLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		res.redirect('/'); // if user is logged in, redirect them to the home page
	else
		return next(); 	// if user isn't authenticated in the session, carry on
};
