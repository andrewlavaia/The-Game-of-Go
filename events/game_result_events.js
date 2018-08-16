const model = require('../models/game_result_model.js');
const utilityRatings = require('../utility/ratings.js');

function formatGameResult(result, data, type) {

  const whiteID = result[0].username_white;
  const blackID = result[0].username_black;
  const loserID = data.userId;
  const winnerID = (loserID === whiteID ? blackID : whiteID);
  const gameString = JSON.stringify(data.WGoGame);

  let gameResult = {
    gameID: result[0].gameid,
    whiteUser: whiteID,
    blackUser: blackID,
    winner: winnerID,
    loser: loserID,
    endCondition: type,
    gameString: gameString,
    whiteScore: 0, // !!! allow adding scores based on type
    blackScore: 0,
    isRated: result[0].israted,
    dateStarted: result[0].datestarted,
  }

  return gameResult;
}

function processGameResult(socket, db, data, type) {
  model.getGame(data.gameId, db, getGameHandler);

  function getGameHandler(result) {
    let gameResult = formatGameResult(result, data, type);
    model.insertGameResult(gameResult, db, insertGameResultHandler);
    if (gameResult.isRated === 1)
      adjustUserRatings(socket, db, gameResult);
  }

  function insertGameResultHandler(result) {
    console.log("Game result inserted succesfully");
    model.deleteGame(data.gameId, db, deleteGameHandler);
  }

  function deleteGameHandler(result) {
    console.log("Game deleted succesfully");
    data.type = type;
    socket.emit('gameEndResponse', data);
    socket.broadcast.emit('gameEndResponse', data);
  }
}

function adjustUserRatings(socket, db, gameResult) {
  model.getUsers(gameResult, db, getUsersHandler);

  function getUsersHandler(result) {
    let winner = (result[0].username === gameResult.winnerID ? result[0] : result[1]);
    let loser = (result[0].username === gameResult.loserID ? result[0] : result[1]);
    let winnerElo = calcRatingChange(winner, loser, 'winner');
    let loserElo = calcRatingChange(winner, loser, 'loser');

    let winnerRankUpdate = {
      userID : winner.username
      elo : winnerElo,
      rank : utilityRatings.convertEloToRank(winnerElo);,
    }

    let loserRankUpdate = {
      userID : loser.username
      elo : loserElo,
      rank : utilityRatings.convertEloToRank(loserElo);,
    }

    model.updateRating(winnerRankUpdate, db, updateRatingHandler);
    model.updateRating(loserRankUpdate, db, updateRatingHandler);
  }

  function updateRatingHandler(result) {
    console.log("Rating updated successfully");
    // update rating history
  }
}


module.exports = function(socket, db) {
  socket.on('resignRequest', (data) => {
    processGameResult(socket, db, data, 'Resignation');
  });

}
