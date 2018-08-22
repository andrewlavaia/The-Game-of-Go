const model = require('../models/game_model.js');

module.exports = {
  submitMove: function submitMove(socket, db, data) {
    model.gameMove(data, db, gameMoveHandler);

    function gameMoveHandler(result) {
      console.log("Move successfully updated");
    }
  }
}
