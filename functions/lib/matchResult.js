const admin = require("../env/firebase");
const elo = require("../lib/elo");

const db = admin.firestore();

// Update database to reflect the result of a game
exports.updateResult = async (winner, loser, result, game_id) => {
  try {
    const winnerRef = db.collection("users").doc(winner);
    const loserRef = db.collection("users").doc(loser);
    const gameRef = db.collection("games").doc(game_id);
    const winnerDetails = await winnerRef.get();
    const loserDetails = await loserRef.get();
    const gameDetails = await gameRef.get();

    let blackNickname;
    let whiteNickname;

    if (winner === gameDetails.data().black_uid) {
      blackNickname = winnerDetails.data().nickname;
      whiteNickname = loserDetails.data().nickname;
    } else {
      whiteNickname = winnerDetails.data().nickname;
      blackNickname = loserDetails.data().nickname;
    }

    // Update winner
    await winnerRef.update({
      elo: elo.getNewRating(
        winnerDetails.data().elo,
        loserDetails.data().elo,
        1
      ),
      games_played: admin.firestore.FieldValue.increment(1),
      num_wins: admin.firestore.FieldValue.increment(1),
    });

    // Update loser
    await loserRef.update({
      elo: elo.getNewRating(
        loserDetails.data().elo,
        winnerDetails.data().elo,
        0
      ),
      games_played: admin.firestore.FieldValue.increment(1),
    });

    // Update game info
    await gameRef.update({ is_over: true, result: result });
    await db
      .collection("kibo")
      .doc(game_id)
      .update({ is_over: true, result: result, isCounting: false });

    // Add game record
    await db
      .collection("records")
      .doc(winner)
      .update({
        record: admin.firestore.FieldValue.arrayUnion({
          id: game_id,
          result: result,
          black: blackNickname,
          white: whiteNickname,
          time: Date.now(),
        }),
      });
    await db
      .collection("records")
      .doc(loser)
      .update({
        record: admin.firestore.FieldValue.arrayUnion({
          id: game_id,
          result: result,
          black: blackNickname,
          white: whiteNickname,
          time: Date.now(),
        }),
      });

    // Delete matching data
    await db.collection("matching").doc(winner).delete();
    await db.collection("matching").doc(loser).delete();

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
