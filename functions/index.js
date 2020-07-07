const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors({ origin: true }));

var serviceAccount = require("./betago-29c7e-firebase-adminsdk-cj5px-166bbfe501.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://betago-29c7e.firebaseio.com",
});
const db = admin.firestore();

app.get("/hello-world", (req, res) => {
  return res.status(200).send("Hello World!");
});

// create game
app.post("/api/create_game", (req, res) => {
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
      return res.status(500).send(error);
    }
  })();
});

// Get whole game
app.get("/api/retrieve_game/:game_id", (req, res) => {
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
      return res.status(500).send(error);
    }
  })();
});

// Join game
app.post("/api/join/:game_id", (req, res) => {
  (async () => {
    try {
      const game = db.collection("games").doc(req.params.game_id);
      const details = await game.get();
      if (!details.exists) {
        throw Error(`Game ${req.params.game_id} does not exist`);
      }
      const data = details.data();
      let response = null;
      const username = req.body.uid;

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
        await game
          .update({ black: username })
          .then(console.log(`Registered ${username} as black.`))
          .catch((error) => console.log(error));
      } else if (response.role === "white") {
        await game
          .update({ white: username })
          .then(console.log(`Registered ${username} as white.`))
          .catch((error) => console.log(error));
      }

      response.row = data.row;
      response.col = data.col;
      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// Play a move
app.post("/api/play/:game_id", (req, res) => {
  (async () => {
    try {
      const game = db.collection("games").doc(req.params.game_id);
      await game
        .update({
          record: admin.firestore.FieldValue.arrayUnion(req.body.move),
          num_moves: admin.firestore.FieldValue.increment(1),
        })
        .then(console.log(`Moved at ${JSON.stringify(req.body.move)}`));
      return res.status(200).send();
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

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

exports.app = functions.https.onRequest(app);
