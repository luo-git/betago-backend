const express = require("express");
const admin = require("../env/firebase");
const checkIfAuthenticated = require("../middleware/checkUserAuth");
const db = admin.firestore();

const queueApi = express.Router();

// Join queue
queueApi.post("/queue/:size/join", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      const uid = req.authId;
      const user = db.collection("status").doc(uid);
      const size = req.params.size;

      let presence = await user.get();
      // Check if user exists
      if (!presence.exists) {
        throw Error(`User ${uid} does not exist!`);
      }
      // Check if user is online
      if (presence.data().state === "offline") {
        console.log(`Warning: User ${uid} is offline!`);
      }

      if ([9, 13, 19].indexOf(parseInt(size)) === -1 && size !== "seasonal") {
        throw Error(
          `Only size 9, 13, 19 or seasonal queues are allowed! Given param: ${size}`
        );
      }

      // Check if user has already in a matched game
      const match = await db.collection("matching").doc(uid).get();
      if (match.exists) {
        throw Error(`User ${uid} is still in a matched game!`);
      }

      const userData = (await db.collection("users").doc(uid).get()).data();

      await db
        .collection("queue_" + size)
        .doc(uid)
        .create({
          elo: userData.elo,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        })
        .then(console.log(`Player ${uid} joined size ${size} queue!`));
      return res.status(200).send({ success: `Joined ${size}x${size} queue!` });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Quit 9x9 queue
queueApi.delete("/queue/:size/remove", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      const player = db.collection("queue_" + req.params.size).doc(req.authId);
      const playerDetails = await player.get();
      if (!playerDetails.exists) {
        throw Error("Player did not join this queue!");
      }
      await player.delete();
      return res.status(200).send({ success: "Removed from queue." });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

module.exports = queueApi;
