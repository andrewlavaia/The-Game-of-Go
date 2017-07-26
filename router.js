module.exports = function(app, passport){

	// Home Page
	app.get('/', function(req,res){
		res.render('home');
	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', isNotLoggedIn, function(req,res){

		var loginMessage = req.flash('loginMessage');

		// render the page and pass in any flash data if it exists
		res.render('login', {
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
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.json({loggedin: true });
        res.redirect('/');
    });
    

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {

		var signupMessage = req.flash('signupMessage');

		// render the page and pass in any flash data if it exists
		res.render('signup', {
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
			user : req.user // get the user out of session and pass to template
		});
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	// 404 Error - Page Not Found
	app.use(function(req,res){ // needs to be last route as it is a catch all
		res.status(404);
		res.render('404');
	});
};

// route middleware to check if user is logged in
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
};

// route middleware to check if user is not logged in (for login page)
function isNotLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		res.redirect('/'); // if user is logged in, redirect them to the home page
	else 
		return next(); 	// if user isn't authenticated in the session, carry on	
};
