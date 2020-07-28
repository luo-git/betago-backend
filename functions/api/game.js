const express = require("express");
const admin = require("../env/firebase");
const checkIfAuthenticated = require("../middleware/checkUserAuth");
const db = admin.firestore();
const matchResult = require("../lib/matchResult");

const gameApi = express.Router();

// Create game
gameApi.post("/game/create", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      await db
        .collection("games")
        .doc(req.body.game_id)
        .create({
          game_id: req.body.game_id,
          game_mode: req.body.game_mode,
          black_uid: null,
          white_uid: null,
          black_nickname: null,
          white_nickname: null,
          black_elo: null,
          white_elo: null,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          time_limit: req.body.time_limit,
          row: req.body.row,
          col: req.body.col,
          is_over: false,
          result: null,
        })
        .then(console.log(`Created game ${req.body.game_id}`));
      await db
        .collection("kibo")
        .doc(req.body.game_id)
        .create({
          is_over: false,
          result: null,
          time_left_black: req.body.time_limit,
          time_left_white: req.body.time_limit,
          num_moves: 0,
          record: [],
          black_accept: false,
          white_accept: false,
          marking: [],
          isCounting: false,
        })
        .then(console.log("Created game record!"));
      return res.status(200).send({ success: "Game created!" });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Get all ongoing games
gameApi.get("/game", (req, res) => {
  (async () => {
    try {
      const game = db
        .collection("games")
        .where("is_over", "==", false)
        .where("game_mode", "==", "Play");
      let details = await game.get();
      if (details.empty) {
        throw Error("No game is found!");
      }
      let response = [];
      details.forEach((doc) => response.push(doc.data()));
      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Get game description
gameApi.get("/game/:game_id", (req, res) => {
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
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Get game record
gameApi.get("/game/:game_id/record", (req, res) => {
  (async () => {
    try {
      const game = db.collection("kibo").doc(req.params.game_id);
      let details = await game.get();
      if (!details.exists) {
        throw Error(`Game ${req.params.game_id} does not exist`);
      }
      let response = details.data();
      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Join game
gameApi.post("/game/:game_id/join", checkIfAuthenticated, (req, res) => {
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
      const myUid = req.authId;
      const myDetails = await db.collection("users").doc(myUid).get();
      const myNickname = myDetails.data().nickname;

      // Check if game mode matches
      if (data.game_mode !== req.body.game_mode) {
        throw Error("Game mode mismatch!");
      }

      // Attempting to assign role
      if (data.black_uid === null) {
        response = { role: "black" };
      } else if (data.black_uid === myUid) {
        response = { role: "black" };
      } else if (data.white_uid === null) {
        response = { role: "white" };
      } else if (data.white_uid === myUid) {
        response = { role: "white" };
      }

      // Update database with the assigned role
      if (response === null) {
        throw Error("Cannot join game. Game is full.");
      } else if (response.role === "black") {
        await gamePath
          .update({ black_uid: myUid, black_nickname: myNickname })
          .then(
            console.log(`${myNickname} joined ${req.params.game_id} as black.`)
          )
          .catch((error) => console.log(error));
      } else if (response.role === "white") {
        await gamePath
          .update({ white_uid: myUid, white_nickname: myNickname })
          .then(
            console.log(`${myNickname} joined ${req.params.game_id} as white.`)
          )
          .catch((error) => console.log(error));
      }

      response.row = data.row;
      response.col = data.col;
      response.is_over = data.is_over;
      return res.status(200).send({ success: response });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Play a move and update time left
gameApi.post("/game/:game_id/play", checkIfAuthenticated, (req, res) => {
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
      // and is playing for the correct color.
      if (
        !(
          (data.black_uid === req.authId && req.body.move.player === 1) ||
          (data.white_uid === req.authId && req.body.move.player === 2)
        )
      ) {
        console.log(req.body.move);
        throw Error(
          `Invalid player: ${req.body.move.player} with uid ${req.authId}`
        );
      }

      // Check if game is over
      if (data.is_over) {
        throw Error("Game is over!");
      }

      await db
        .collection("kibo")
        .doc(req.params.game_id)
        .update({
          record: admin.firestore.FieldValue.arrayUnion(req.body.move),
          num_moves: admin.firestore.FieldValue.increment(1),
          time_left_black: req.body.time_left_black,
          time_left_white: req.body.time_left_white,
        })
        .then(console.log(`Moved at ${JSON.stringify(req.body.move)}`));
      return res
        .status(200)
        .send({ success: `Played at ${JSON.stringify(req.body.move)}` });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Pass a move
gameApi.post("/game/:game_id/pass", checkIfAuthenticated, (req, res) => {
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
      // and is playing for the correct color.
      if (
        !(
          (data.black_uid === req.authId && req.body.player === 1) ||
          (data.white_uid === req.authId && req.body.player === 2)
        )
      ) {
        console.log(req.body);
        throw Error(
          `Invalid player: ${req.body.player} with uid ${req.authId}`
        );
      }

      // Check if game is over
      if (data.is_over) {
        throw Error("Game is over!");
      }

      await db
        .collection("kibo")
        .doc(req.params.game_id)
        .update({
          record: admin.firestore.FieldValue.arrayUnion({
            move_num: req.body.move_num,
            player: req.body.player,
            position: [-1, -1],
          }),
          num_moves: admin.firestore.FieldValue.increment(1),
          time_left_black: req.body.time_left_black,
          time_left_white: req.body.time_left_white,
        })
        .then(console.log(`Passed!`));
      return res.status(200).send({ success: `Pass accepted!` });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Lose a game
gameApi.post("/game/:game_id/lose", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      const gamePath = db.collection("games").doc(req.params.game_id);
      const game = await gamePath.get();
      let winnerRef;
      let loserRef;
      let winColour;

      // Check if game exists
      if (!game.exists) {
        throw Error(`Game ${req.params.game_id} does not exist`);
      }
      const data = game.data();

      // Check if game is a test game and update accordingly
      if (data.game_mode === "Test") {
        await gamePath.update({ is_over: true, result: "Test complete" });
        await db
          .collection("kibo")
          .doc(req.params.game_id)
          .update({ is_over: true, result: "Test complete" });
        return res.status(200).send({ error: "Test game ended!" });
      }

      // Check if game is already over
      if (data.is_over) {
        throw Error(`Game ${req.params.game_id} already ended!`);
      }

      // Check if user has joined the game as player
      if (data.black_uid === req.authId) {
        winnerRef = data.white_uid;
        loserRef = data.black_uid;
        winColour = "white";
      } else if (data.white_uid === req.authId) {
        winnerRef = data.black_uid;
        loserRef = data.white_uid;
        winColour = "black";
      } else {
        throw Error(`Player did not join ${req.param.game_id}.`);
      }
      console.log(
        `${req.params.game_id} lost by ${
          winColour === "black" ? data.white_nickname : data.black_nickname
        }. ${winColour} wins!`
      );

      await matchResult
        .updateResult(
          winnerRef,
          loserRef,
          winColour +
            " wins by " +
            (req.body.reason !== undefined ? req.body.reason : ""),
          req.params.game_id
        )
        .then((result) => console.log("Updated result: ", result));

      return res
        .status(200)
        .send({ success: `Loss by ${req.authId} accepted` });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Deprecated.
// Sync game time after a move is made
// Usage of this endpoint togther with play
// creates delay.
gameApi.post("/game/:game_id/time", checkIfAuthenticated, (req, res) => {
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
      if (!(data.black_uid === req.authId || data.white_uid === req.authId)) {
        throw Error(`Invalid player with uid ${req.authId}`);
      }

      // Check if game is over
      if (data.is_over) {
        throw Error("Game is over!");
      }

      await db
        .collection("kibo")
        .doc(req.params.game_id)
        .update({
          time_left_black: req.body.time_left_black,
          time_left_white: req.body.time_left_white,
        })
        .then(
          console.log(
            `Sync time black: ${req.body.time_left_black}, white: ${req.body.time_left_white}`
          )
        );
      return res.status(200).send({ success: "Time sync ok!" });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Initiate counting
gameApi.post("/game/:game_id/count", checkIfAuthenticated, (req, res) => {
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
      if (!(data.black_uid === req.authId || data.white_uid === req.authId)) {
        throw Error(`Invalid player with uid ${req.authId}`);
      }

      // Check if game is over
      if (data.is_over) {
        throw Error("Game is over!");
      }

      await db
        .collection("kibo")
        .doc(req.params.game_id)
        .update({
          isCounting: true,
        })
        .then(console.log("Initiated counting"));
      return res.status(200).send({ success: "Initiated counting." });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Update a marking
gameApi.post("/game/:game_id/marking", checkIfAuthenticated, (req, res) => {
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
      // and is playing for the correct color.
      if (
        !(
          (data.black_uid === req.authId && req.body.marking.player === 1) ||
          (data.white_uid === req.authId && req.body.marking.player === 2)
        )
      ) {
        console.log(req.body.marking);
        throw Error(
          `Invalid player: ${req.body.marking.player} with uid ${req.authId}`
        );
      }

      // Check if game is over
      if (data.is_over) {
        throw Error("Game is over!");
      }

      await db
        .collection("kibo")
        .doc(req.params.game_id)
        .update({
          marking: admin.firestore.FieldValue.arrayUnion(req.body.marking),
        })
        .then(
          console.log(
            `${req.body.marking.player} marked at ${JSON.stringify(
              req.body.marking.position
            )}`
          )
        );
      return res.status(200).send({
        success: `Marked at ${JSON.stringify(req.body.marking.position)}`,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Stop counting mode due to dispute in territorial marking
gameApi.post("/game/:game_id/quit_count", checkIfAuthenticated, (req, res) => {
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
      if (!(data.black_uid === req.authId || data.white_uid === req.authId)) {
        throw Error(`Invalid player with uid ${req.authId}`);
      }

      // Check if game is over
      if (data.is_over) {
        throw Error("Game is over!");
      }

      await db
        .collection("kibo")
        .doc(req.params.game_id)
        .update({
          marking: [],
          isCounting: false,
          black_accept: false,
          white_accept: false,
        })
        .then(console.log("Stopped counting"));
      return res.status(200).send({ success: "Counting stopped." });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Accept counting
gameApi.post(
  "/game/:game_id/accept_count",
  checkIfAuthenticated,
  (req, res) => {
    (async () => {
      try {
        const gamePath = db.collection("games").doc(req.params.game_id);
        const game = await gamePath.get();

        //Check if game exists
        if (!game.exists) {
          throw Error(`Game ${req.params.game_id} does not exist`);
        }
        const data = game.data();
        let isBlack = false;

        // Check if user has joined the game as player
        if (data.black_uid === req.authId) {
          isBlack = true;
        } else if (data.white_uid === req.authId) {
          isBlack = false;
        } else {
          throw Error(`Invalid player with uid ${req.authId}`);
        }

        // Check if game is over
        if (data.is_over) {
          throw Error("Game is over!");
        }

        // Check if game is not in counting mode
        if (data.isCounting) {
          throw Error("Game is not counting yet!");
        }

        if (isBlack) {
          await db
            .collection("kibo")
            .doc(req.params.game_id)
            .update({
              black_accept: true,
            })
            .then(console.log("Black accepted counting result"));
        } else {
          await db
            .collection("kibo")
            .doc(req.params.game_id)
            .update({
              white_accept: true,
            })
            .then(console.log("White accepted counting result"));
        }
        return res.status(200).send({ success: "Counting accepted." });
      } catch (error) {
        console.log(error);
        return res.status(500).send({ error: error.message });
      }
    })();
  }
);

// Send Emote
gameApi.post("/game/:game_id/emote", checkIfAuthenticated, (req, res) => {
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
      // and is playing for the correct color.
      if (
        !(
          (data.black_uid === req.authId &&
            req.body.white_emote === undefined) ||
          (data.white_uid === req.authId && req.body.black_emote === undefined)
        )
      ) {
        console.log(req.body);
        throw Error(`Invalid emote request by player!`);
      }

      if (data.black_uid === req.authId) {
        await db
          .collection("kibo")
          .doc(req.params.game_id)
          .update({
            black_emote: req.body.black_emote,
          })
          .then(console.log(`Emote updated!`));
      } else if (data.white_uid === req.authId) {
        await db
          .collection("kibo")
          .doc(req.params.game_id)
          .update({
            white_emote: req.body.white_emote,
          })
          .then(console.log(`Emote updated!`));
      } else {
        throw Error("Invalid request body!");
      }
      return res.status(200).send({ success: `Emote accepted!` });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
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
