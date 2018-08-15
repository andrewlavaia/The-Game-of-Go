const model = require('../models/game_result_model.js');

function formatGameResult() {
  let gameResult = {
    gameID: ,
    whiteUser,
    blackUser,
    winner,
    endCondition,
    gameString,
    whiteScore,
    blackScore,
    isRated,
    dateStarted,
  }

  return gameResult;
}

module.exports = function(socket, db) {
  socket.on('resignRequest', (data) => {

    model.getGame(data.gameId, db, getGameRequestHandler);

    function getGameHandler(result) {
      let gameResult = formatGameResult(result);
      model.insertGameResult(gameResult, insertGameResultHandler);
    }
  });

}
