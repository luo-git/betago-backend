const functions = require("firebase-functions");
const admin = require("../env/firebase");

const db = admin.firestore();

// Parameters
const ELO_DELTA = 150;
const MAX_RETRY = 10;

// Match 2 players based on elo in the 9x9 queuek
exports.matchPlayer = functions.firestore
  .document("/queue_9/{playerId}")
  .onCreate(async (snap, context) => {
    const values = snap.data();
    const myElo = values.elo;
    const myUID = context.params.playerId;
    let retryCount = 1;
    console.log(`My elo: ${myElo}, myUID: ${myUID}`);

    return db.runTransaction(async (t) => {
      console.log("Matchmaking try", retryCount);
      const queueRef = db.collection("queue_9");
      const opponentsSnapshot = await queueRef
        .where("elo", "<=", myElo + ELO_DELTA)
        .where("elo", ">=", myElo - ELO_DELTA)
        .get();
      const oppId = opponentsSnapshot.docs
        .map((doc) => doc.id)
        .filter((id) => id !== myUID)[0];
      const gameIdRef = db.collection("global").doc("games");
      const game_id_data = await gameIdRef.get();
      const game_id = game_id_data.data().num_games;
      console.log("game_id:", game_id);

      if (oppId !== undefined) {
        console.log("found opponent", oppId);
        return t
          .getAll(queueRef.doc(oppId), queueRef.doc(myUID))
          .then((docs) => {
            // Delete matched players
            console.log("Deleted players.");
            docs.forEach((doc) => t.delete(doc.ref));

            // Set matching listener for me
            t.set(db.collection("matching").doc(myUID), {
              game_id: game_id,
            });

            // Set matching listener for my opponent
            t.set(db.collection("matching").doc(oppId), {
              game_id: game_id,
            });

            // Update number of games
            t.update(db.collection("global").doc("games"), {
              num_games: game_id + 1,
            });

            // Create game
            const coin = Math.random() >= 0.5 ? "head" : "tail";
            console.log("Dice rolled", coin);
            t.set(db.collection("games").doc(game_id.toString()), {
              game_id: game_id,
              game_mode: "Play",
              black: coin === "head" ? myUID : oppId,
              white: coin === "head" ? oppId : myUID,
              created_at: Date.now(),
              time_limit: 600,
              num_moves: 0,
              record: [],
              row: 9,
              col: 9,
            });
            console.log("Created game", game_id);

            return true;
          });
      }

      // If no viable opponent is found, the transaction terminates.
      // Eventually other invocations (by other players who join) of
      // this function will result in matches.
      return null;
    });
  });
