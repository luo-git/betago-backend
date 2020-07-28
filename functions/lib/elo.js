/**
 * Encapsulate all calculations and methods regarding to elo.
 * Uses EGF implementation of Elo rating system which
 * establishes correspondence between rating and Go dan/kyu ranks.
 *
 * For more information, please refer to:
 * https://senseis.xmp.net/?EGFRatingSystem
 */

// Compute the winning probabilty of player A against player B.
exports.getWinningProb = (ratingPlayerA, ratingPlayerB) => {
  if (ratingPlayerA < ratingPlayerB) {
    return (
      1 /
      (Math.pow(
        Math.E,
        getRatingDiff(ratingPlayerA, ratingPlayerB) / getA(ratingPlayerA)
      ) +
        1)
    );
  } else if (ratingPlayerA > ratingPlayerB) {
    return 1 - this.getWinningProb(ratingPlayerB, ratingPlayerA);
  } else {
    return 0.5;
  }
};

// Compute the expected change in rating of player A based on the outcome
// of the game.
exports.getRatingDelta = (ratingPlayerA, ratingPlayerB, outcome) => {
  if (!isValidOutcome(outcome)) {
    throw Error("Outcome of game is invalid!");
  }
  const K = getK(ratingPlayerA);
  const winningProb = this.getWinningProb(ratingPlayerA, ratingPlayerB);
  return Math.round(K * (outcome - winningProb));
};

// Compute the new rating of the current player.
exports.getNewRating = (currRating, oppRating, outcome) => {
  if (!isValidOutcome(outcome)) {
    throw Error("Outcome of game is invalid!");
  }
  return currRating + this.getRatingDelta(currRating, oppRating, outcome);
};

// Get the difference in rating of 2 players
const getRatingDiff = (ratingA, ratingB) => {
  return Math.abs(ratingA - ratingB);
};

// Computation of "a" for elo calculation
const getA = (rating) => {
  return 205 - rating / 20;
};

// Approximation of "K" for elo calculation
// Approximation is accurate to +/-2 of the actual value of K
const getK = (rating) => {
  return 122 - 6 * (rating / 100) + Math.pow(rating / 100, 2) / 15;
};

// Get the corresponding Dan/Kyu ranking of the given elo rating
exports.getDanFromRating = (rating) => {
  if (rating < 100) {
    return "20k";
  } else if (rating < 2100) {
    let n = (2200 - rating - 1) / 100;
    return (n | 0) + "k";
  } else if (rating < 2900) {
    let n = (rating - 2000) / 100;
    return (n | 0) + "d";
  } else {
    return "9d";
  }
};

// Check if an game outcome is valid (1: win, 0.5: draw, 0: loss)
const isValidOutcome = (outcome) => {
  return [1, 0.5, 0].indexOf(outcome) !== -1;
};
