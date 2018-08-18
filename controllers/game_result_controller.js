const model = require('../models/game_result_model.js');
const utilityRatings = require('../utility/ratings.js');

function formatGameResult(result, data, type, loserID) {

  const whiteID = result[0].username_white;
  const blackID = result[0].username_black;
  const winnerID = (loserID === whiteID ? blackID : whiteID);
  const gameString = JSON.stringify(data.game);

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

function calcRatingChange(winner, loser, gameResult) {
  // elo formula
  const k = 32; // k-factor

  const r1 = Math.pow(10, (winner.elo / 400)); // eslint-disable-line no-restricted-properties
  const r2 = Math.pow(10, (loser.elo / 400)); // eslint-disable-line no-restricted-properties

  const e1 = r1 / (r1 + r2);
  const e2 = r2 / (r1 + r2);

  // set score multiplier (1 = win, 0 = loss, 0.5 = draw)
  let s1;
  let s2;
  if (gameResult.endCondition !== 'No Result') {
    s1 = 1; // score multiplier (1 = win)
    s2 = 0; // score multiplier (0 = loss)
  } else {
    s1 = 0.5;
    s2 = 0.5;
  }

  let newEloWinner = winner.elo + (k * (s1 - e1));
  let newEloLoser = loser.elo + (k * (s2 - e2));

  if (newEloWinner < 0)
    newEloWinner = 0; // in case of a draw
  if (newEloLoser < 0)
    newEloLoser = 0;

  let ratingChanges = {
    winnerRating: newEloWinner,
    loserRating: newEloLoser,
  }

  return ratingChanges;
}

function adjustUserRatings(socket, db, gameResult) {
  model.getUsers(gameResult, db, getUsersHandler);

  function getUsersHandler(result) {
    let winner = (result[0].username === gameResult.winner ? result[0] : result[1]);
    let loser = (result[0].username === gameResult.loser ? result[0] : result[1]);
    let ratingChanges = calcRatingChange(winner, loser, gameResult);

    let winnerRankUpdate = {
      userID : winner.username,
      newElo : ratingChanges.winnerRating,
      oldElo : winner.elo,
      rank : utilityRatings.convertEloToRank(ratingChanges.winnerRating),
      gameID: gameResult.gameID,
    }

    let loserRankUpdate = {
      userID : loser.username,
      newElo : ratingChanges.loserRating,
      oldElo : loser.elo,
      rank : utilityRatings.convertEloToRank(ratingChanges.loserRating),
      gameID: gameResult.gameID,
    }

    model.updateRating(winnerRankUpdate, db, updateRatingHandler);
    model.updateRating(loserRankUpdate, db, updateRatingHandler);
    model.updateRatingHistory(winnerRankUpdate, db, updateRatingHistoryHandler);
    model.updateRatingHistory(loserRankUpdate, db, updateRatingHistoryHandler);
  }

  function updateRatingHandler(result) {
    console.log("Rating updated successfully");
  }
  function updateRatingHistoryHandler(result) {
    console.log("Rating history updated successfully");
  }
}

module.exports = {
  processGameResult: function processGameResult(socket, db, data, type, loser) {
    model.getGame(data.gameId, db, getGameHandler);

    function getGameHandler(result) {
      let gameResult = formatGameResult(result, data, type, loser);
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
  },
}
