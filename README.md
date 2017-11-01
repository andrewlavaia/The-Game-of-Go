# The Game of Go

Online Go server

## Deployment

node app.js
forever start app.js // start server
forever list // list running processes
forever stop 0 // stop server


## Built With

* [WGo.js](http://wgo.waltheri.net/tutorials/board) - Go game logic and board CSS
* [online-go/score-estimator](https://github.com/online-go/score-estimator) - C++ file to calculate score during Go Games
* [emscripten](https://github.com/kripken/emscripten) - Used to convert C++ file to javascript


## Config

* git config core.autocrlf input - Will only convert LF to CRLF on commit and not the reverse on checkout

## Author

Andrew Lavaia

