const functions = require("firebase-functions");
const admin = require("../env/firebase");

const db = admin.firestore();

// Parameters
const ELO_DELTA = 150;
const MAX_RETRY = 10;

// Match 2 players based on elo in the 9x9 queue
exports.matchPlayer9 = functions.firestore
  .document("/queue_9/{playerId}")
  .onCreate(async (snap, context) => {
    const values = snap.data();
    const myElo = values.elo;
    const myUID = context.params.playerId;
    const myDetails = await db.collection("users").doc(myUID).get();
    console.log(`My elo: ${myElo}, myUID: ${myUID}`);

    return db.runTransaction(async (t) => {
      // Attempt to find opponent of similar elo
      const queueRef = db.collection("queue_9");
      const opponentsSnapshot = await queueRef
        .where("elo", "<=", myElo + ELO_DELTA)
        .where("elo", ">=", myElo - ELO_DELTA)
        .get();
      const oppId = opponentsSnapshot.docs
        .map((doc) => doc.id)
        .filter((id) => id !== myUID)[0];
      console.log(oppId);

      // Get game ID to use
      const gameIdRef = db.collection("global").doc("games");
      const game_id_data = await gameIdRef.get();
      const game_id = game_id_data.data().num_games;
      console.log("game_id:", game_id);

      if (oppId !== undefined) {
        console.log("found opponent", oppId);
        const oppDetails = await db.collection("users").doc(oppId).get();
        const oppMatch = await db.collection("matching").doc(oppId).get();
        if (oppMatch.exists) {
          throw Error(`${oppId} has already been matched!`);
        }
        return t
          .getAll(queueRef.doc(oppId), queueRef.doc(myUID))
          .then((docs) => {
            // Delete matched players
            console.log("Deleted players.");
            docs.forEach((doc) => t.delete(doc.ref));

            // Set matching listener for me
            t.set(db.collection("matching").doc(myUID), {
              game_id: game_id,
              opp_id: oppId,
            });

            // Set matching listener for my opponent
            t.set(db.collection("matching").doc(oppId), {
              game_id: game_id,
              oppId: myUID,
            });

            // Update number of games
            t.update(db.collection("global").doc("games"), {
              num_games: game_id + 1,
            });

            // Create game details
            const coin = Math.random() >= 0.5 ? "head" : "tail";
            console.log("Dice rolled", coin);
            t.set(db.collection("games").doc(game_id.toString()), {
              game_id: game_id,
              game_mode: "Play",
              black_uid: coin === "head" ? myUID : oppId,
              white_uid: coin === "head" ? oppId : myUID,
              black_nickname:
                coin === "head"
                  ? myDetails.data().nickname
                  : oppDetails.data().nickname,
              white_nickname:
                coin === "head"
                  ? oppDetails.data().nickname
                  : myDetails.data().nickname,
              black_elo:
                coin === "head" ? myDetails.data().elo : oppDetails.data().elo,
              white_elo:
                coin === "head" ? oppDetails.data().elo : myDetails.data().elo,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              time_limit: 300,
              is_over: false,
              row: 9,
              col: 9,
            });

            // Create game record
            t.set(db.collection("kibo").doc(game_id.toString()), {
              is_over: false,
              result: null,
              time_left_black: 300,
              time_left_white: 300,
              num_moves: 0,
              record: [],
              black_accept: false,
              white_accept: false,
              marking: [],
              isCounting: false,
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

// Match 2 players based on elo in the 13x13 queue
exports.matchPlayer13 = functions.firestore
  .document("/queue_13/{playerId}")
  .onCreate(async (snap, context) => {
    const values = snap.data();
    const myElo = values.elo;
    const myUID = context.params.playerId;
    const myDetails = await db.collection("users").doc(myUID).get();
    console.log(`My elo: ${myElo}, myUID: ${myUID}`);

    return db.runTransaction(async (t) => {
      // Attempt to find opponent of similar elo
      const queueRef = db.collection("queue_13");
      const opponentsSnapshot = await queueRef
        .where("elo", "<=", myElo + ELO_DELTA)
        .where("elo", ">=", myElo - ELO_DELTA)
        .get();
      const oppId = opponentsSnapshot.docs
        .map((doc) => doc.id)
        .filter((id) => id !== myUID)[0];
      console.log(oppId);

      // Get game ID to use
      const gameIdRef = db.collection("global").doc("games");
      const game_id_data = await gameIdRef.get();
      const game_id = game_id_data.data().num_games;
      console.log("game_id:", game_id);

      if (oppId !== undefined) {
        console.log("found opponent", oppId);
        const oppDetails = await db.collection("users").doc(oppId).get();
        const oppMatch = await db.collection("matching").doc(oppId).get();
        if (oppMatch.exists) {
          throw Error(`${oppId} has already been matched!`);
        }
        return t
          .getAll(queueRef.doc(oppId), queueRef.doc(myUID))
          .then((docs) => {
            // Delete matched players
            console.log("Deleted players.");
            docs.forEach((doc) => t.delete(doc.ref));

            // Set matching listener for me
            t.set(db.collection("matching").doc(myUID), {
              game_id: game_id,
              opp_id: oppId,
            });

            // Set matching listener for my opponent
            t.set(db.collection("matching").doc(oppId), {
              game_id: game_id,
              oppId: myUID,
            });

            // Update number of games
            t.update(db.collection("global").doc("games"), {
              num_games: game_id + 1,
            });

            // Create game details
            const coin = Math.random() >= 0.5 ? "head" : "tail";
            console.log("Dice rolled", coin);
            t.set(db.collection("games").doc(game_id.toString()), {
              game_id: game_id,
              game_mode: "Play",
              black_uid: coin === "head" ? myUID : oppId,
              white_uid: coin === "head" ? oppId : myUID,
              black_nickname:
                coin === "head"
                  ? myDetails.data().nickname
                  : oppDetails.data().nickname,
              white_nickname:
                coin === "head"
                  ? oppDetails.data().nickname
                  : myDetails.data().nickname,
              black_elo:
                coin === "head" ? myDetails.data().elo : oppDetails.data().elo,
              white_elo:
                coin === "head" ? oppDetails.data().elo : myDetails.data().elo,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              time_limit: 480,
              is_over: false,
              row: 13,
              col: 13,
            });

            // Create game record
            t.set(db.collection("kibo").doc(game_id.toString()), {
              is_over: false,
              result: null,
              time_left_black: 480,
              time_left_white: 480,
              num_moves: 0,
              record: [],
              black_accept: false,
              white_accept: false,
              marking: [],
              isCounting: false,
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

// Match 2 players based on elo in the 19x19 queue
exports.matchPlayer19 = functions.firestore
  .document("/queue_19/{playerId}")
  .onCreate(async (snap, context) => {
    const values = snap.data();
    const myElo = values.elo;
    const myUID = context.params.playerId;
    const myDetails = await db.collection("users").doc(myUID).get();
    console.log(`My elo: ${myElo}, myUID: ${myUID}`);

    return db.runTransaction(async (t) => {
      // Attempt to find opponent of similar elo
      const queueRef = db.collection("queue_19");
      const opponentsSnapshot = await queueRef
        .where("elo", "<=", myElo + ELO_DELTA)
        .where("elo", ">=", myElo - ELO_DELTA)
        .get();
      const oppId = opponentsSnapshot.docs
        .map((doc) => doc.id)
        .filter((id) => id !== myUID)[0];
      console.log(oppId);

      // Get game ID to use
      const gameIdRef = db.collection("global").doc("games");
      const game_id_data = await gameIdRef.get();
      const game_id = game_id_data.data().num_games;
      console.log("game_id:", game_id);

      if (oppId !== undefined) {
        console.log("found opponent", oppId);
        const oppDetails = await db.collection("users").doc(oppId).get();
        const oppMatch = await db.collection("matching").doc(oppId).get();
        if (oppMatch.exists) {
          throw Error(`${oppId} has already been matched!`);
        }
        return t
          .getAll(queueRef.doc(oppId), queueRef.doc(myUID))
          .then((docs) => {
            // Delete matched players
            console.log("Deleted players.");
            docs.forEach((doc) => t.delete(doc.ref));

            // Set matching listener for me
            t.set(db.collection("matching").doc(myUID), {
              game_id: game_id,
              opp_id: oppId,
            });

            // Set matching listener for my opponent
            t.set(db.collection("matching").doc(oppId), {
              game_id: game_id,
              oppId: myUID,
            });

            // Update number of games
            t.update(db.collection("global").doc("games"), {
              num_games: game_id + 1,
            });

            // Create game details
            const coin = Math.random() >= 0.5 ? "head" : "tail";
            console.log("Dice rolled", coin);
            t.set(db.collection("games").doc(game_id.toString()), {
              game_id: game_id,
              game_mode: "Play",
              black_uid: coin === "head" ? myUID : oppId,
              white_uid: coin === "head" ? oppId : myUID,
              black_nickname:
                coin === "head"
                  ? myDetails.data().nickname
                  : oppDetails.data().nickname,
              white_nickname:
                coin === "head"
                  ? oppDetails.data().nickname
                  : myDetails.data().nickname,
              black_elo:
                coin === "head" ? myDetails.data().elo : oppDetails.data().elo,
              white_elo:
                coin === "head" ? oppDetails.data().elo : myDetails.data().elo,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              time_limit: 600,
              is_over: false,
              row: 19,
              col: 19,
            });

            // Create game record
            t.set(db.collection("kibo").doc(game_id.toString()), {
              is_over: false,
              result: null,
              time_left_black: 600,
              time_left_white: 600,
              num_moves: 0,
              record: [],
              black_accept: false,
              white_accept: false,
              marking: [],
              isCounting: false,
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

// Match 2 players based on elo in the 19x19 queue
exports.matchPlayerSeasonal = functions.firestore
  .document("/queue_seasonal/{playerId}")
  .onCreate(async (snap, context) => {
    const values = snap.data();
    const myElo = values.elo;
    const myUID = context.params.playerId;
    const myDetails = await db.collection("users").doc(myUID).get();
    console.log(`My elo: ${myElo}, myUID: ${myUID}`);

    return db.runTransaction(async (t) => {
      // Attempt to find opponent of similar elo
      const queueRef = db.collection("queue_seasonal");
      const opponentsSnapshot = await queueRef
        .where("elo", "<=", myElo + ELO_DELTA)
        .where("elo", ">=", myElo - ELO_DELTA)
        .get();
      const oppId = opponentsSnapshot.docs
        .map((doc) => doc.id)
        .filter((id) => id !== myUID)[0];
      console.log(oppId);

      // Get game ID to use
      const gameIdRef = db.collection("global").doc("games");
      const game_id_data = await gameIdRef.get();
      const game_id = game_id_data.data().num_games;
      console.log("game_id:", game_id);

      if (oppId !== undefined) {
        console.log("found opponent", oppId);
        const oppDetails = await db.collection("users").doc(oppId).get();
        const oppMatch = await db.collection("matching").doc(oppId).get();
        if (oppMatch.exists) {
          throw Error(`${oppId} has already been matched!`);
        }
        return t
          .getAll(queueRef.doc(oppId), queueRef.doc(myUID))
          .then((docs) => {
            // Delete matched players
            console.log("Deleted players.");
            docs.forEach((doc) => t.delete(doc.ref));

            // Set matching listener for me
            t.set(db.collection("matching").doc(myUID), {
              game_id: game_id,
              opp_id: oppId,
            });

            // Set matching listener for my opponent
            t.set(db.collection("matching").doc(oppId), {
              game_id: game_id,
              oppId: myUID,
            });

            // Update number of games
            t.update(db.collection("global").doc("games"), {
              num_games: game_id + 1,
            });

            // Create game details
            const coin = Math.random() >= 0.5 ? "head" : "tail";
            console.log("Dice rolled", coin);
            t.set(db.collection("games").doc(game_id.toString()), {
              game_id: game_id,
              game_mode: "Play",
              black_uid: coin === "head" ? myUID : oppId,
              white_uid: coin === "head" ? oppId : myUID,
              black_nickname:
                coin === "head"
                  ? myDetails.data().nickname
                  : oppDetails.data().nickname,
              white_nickname:
                coin === "head"
                  ? oppDetails.data().nickname
                  : myDetails.data().nickname,
              black_elo:
                coin === "head" ? myDetails.data().elo : oppDetails.data().elo,
              white_elo:
                coin === "head" ? oppDetails.data().elo : myDetails.data().elo,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              time_limit: 600,
              is_over: false,
              row: 13,
              col: 9,
            });

            // Create game record
            t.set(db.collection("kibo").doc(game_id.toString()), {
              is_over: false,
              result: null,
              time_left_black: 600,
              time_left_white: 600,
              num_moves: 0,
              record: [],
              black_accept: false,
              white_accept: false,
              marking: [],
              isCounting: false,
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
