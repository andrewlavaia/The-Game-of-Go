module.exports = function(app){

	// Home Page
	app.get('/', function(req,res){
		res.render('home');
	});

	// 404 Error - Page Not Found
	app.use(function(req,res){
		res.status(404);
		res.render('404');
	});
};