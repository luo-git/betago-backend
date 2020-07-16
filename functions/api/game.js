const express = require("express");
const admin = require("../env/firebase");
const checkIfAuthenticated = require("../middleware/checkUserAuth");
const db = admin.firestore();

const gameApi = express.Router();

// Create game
gameApi.post("/game/create", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      await db
        .collection("games")
        .doc("/" + req.body.game_id + "/")
        .create({
          game_id: req.body.game_id,
          game_mode: req.body.game_mode,
          black: null,
          white: null,
          created_at: Date.now(),
          time_limit: req.body.time_limit,
          num_moves: 0,
          record: [],
          row: req.body.row,
          col: req.body.col,
        })
        .then(console.log(`Created game ${req.body.game_id}`));
      return res.status(200).send();
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error });
    }
  })();
});

// Get whole game
gameApi.get("/game/retrieve/:game_id", (req, res) => {
  (async () => {
    try {
      const game = db.collection("games").doc(req.params.game_id);
      let details = await game.get();
      if (!details.exists) {
        throw Error(`Game ${req.params.game_id} does not exist`);
      }
      let response = details.data();
      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error });
    }
  })();
});

// Join game
gameApi.post("/game/join/:game_id", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      const gamePath = db.collection("games").doc(req.params.game_id);
      const game = await gamePath.get();
      // Check if game exists
      if (!game.exists) {
        throw Error(`Game ${req.params.game_id} does not exist`);
      }
      const data = game.data();
      let response = null;
      const username = req.authId;

      // Check if game mode matches
      if (data.game_mode !== req.body.game_mode) {
        throw Error("Game mode mismatch!");
      }

      // Attempting to assign role
      if (data.black === null) {
        response = { role: "black" };
      } else if (data.black === username) {
        response = { role: "black" };
      } else if (data.white === null) {
        response = { role: "white" };
      } else if (data.white === username) {
        response = { role: "white" };
      }

      // Update database with the assigned role
      if (response === null) {
        throw Error("Cannot join game. Game is full.");
      } else if (response.role === "black") {
        await gamePath
          .update({ black: username })
          .then(console.log(`Registered ${username} as black.`))
          .catch((error) => console.log(error));
      } else if (response.role === "white") {
        await gamePath
          .update({ white: username })
          .then(console.log(`Registered ${username} as white.`))
          .catch((error) => console.log(error));
      }

      response.row = data.row;
      response.col = data.col;
      return res.status(200).send({ success: response });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error });
    }
  })();
});

// Play a move
gameApi.post("/game/play/:game_id", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      const gamePath = db.collection("games").doc(req.params.game_id);
      const game = await gamePath.get();
      // Check if game exists
      if (!game.exists) {
        throw Error(`Game ${req.params.game_id} does not exist`);
      }
      const data = game.data();

      // Check if user has joined the game as player
      if (data.black !== req.authId && data.white !== req.authId) {
        throw Error(`Player did not join ${req.param.game_id}.`);
      }

      await gamePath
        .update({
          record: admin.firestore.FieldValue.arrayUnion(req.body.move),
          num_moves: admin.firestore.FieldValue.increment(1),
        })
        .then(console.log(`Moved at ${JSON.stringify(req.body.move)}`));
      return res
        .status(200)
        .send({ success: `Played at ${JSON.stringify(req.body.move)}` });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error });
    }
  })();
});

module.exports = gameApi;

// // delete
// app.delete("/api/delete/:item_id", (req, res) => {
//   (async () => {
//     try {
//       const document = db.collection("items").doc(req.params.item_id);
//       await document.delete();
//       return res.status(200).send();
//     } catch (error) {
//       console.log(error);
//       return res.status(500).send(error);
//     }
//   })();
// });
