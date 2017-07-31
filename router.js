module.exports = function(app, passport){

	// Home Page
	app.get('/', function(req,res){
		
		if(req.user) {
			console.log("Passport - logged in as " + req.user.username);
			res.render('home', {
				pageTitle : 'Home',
				username : req.user.username
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

		// render the page and pass in any flash data if it exists
		res.render('login', {
			pageTitle : 'Login',
			loginMessage,
			helpers: {
				/*
				loginMessage: function () { return req.flash('loginMessage'); },
				loginMessageExists: function() { 
						return true;
						*/
			}
		});
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
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
			signupMessage,
			helpers: {
				// signupMessage: function() { return req.flash('signupMessage'); }
			}
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
			username : req.user.username 
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
	// PLAY - LIVE =========================
	// =====================================
	app.get('/gamelobby', isLoggedIn, function(req, res) {
		res.render('gamelobby', {
			pageTitle : 'Live Game Lobby',
			includeGoScripts : 'true', // required to load go scripts in page
			userid : req.user.userid, 
			username : req.user.username 
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
			username : req.user.username 
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
			username : req.user.username 
		});
	});


	// =====================================
	// LEARN - INTRODUCTION ================
	// =====================================
	app.get('/learn_intro', function(req, res) {

		if(req.user) {
			res.render('learn_intro', {
				pageTitle : 'Introduction to Go',
				username : req.user.username
			});
		} else {
			res.render('learn_intro', {
				pageTitle : 'Introduction to Go'
			});
		}
	});

	// =====================================
	// LEARN - BASICS ======================
	// =====================================
	app.get('/learn_basics', function(req, res) {
		if(req.user) {
			res.render('learn_basics', {
				pageTitle : 'Basic Rules of Go',
				username : req.user.username
			});
		} else {
			res.render('learn_basics', {
				pageTitle : 'Basic Rules of Go'
			});
		}
	});

	// =====================================
	// LEARN - ADVANCED ====================
	// =====================================
	app.get('/learn_advanced', function(req, res) {
		if(req.user) {
			res.render('learn_advanced', {
				pageTitle : 'Advanced Rules of Go',
				username : req.user.username
			});
		} else {
			res.render('learn_advanced', {
				pageTitle : 'Advanced Rules of Go',
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
				username : req.user.username
			});
		} else {
			res.render('learn_lessons', {
				pageTitle : 'Lessons'
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
				username : req.user.username
			});
		} else {
			res.render('learn_openings', {
				pageTitle : 'Openings'
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
			username : req.user.username 
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
			username : req.user.username 
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
			username : req.user.username 
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
			username : req.user.username 
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
			username : req.user.username 
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
			username : req.user.username 
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
				username : req.user.username // needed to show top user navigation
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
