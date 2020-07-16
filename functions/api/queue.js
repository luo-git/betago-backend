const express = require("express");
const admin = require("../env/firebase");
const checkIfAuthenticated = require("../middleware/checkUserAuth");
const db = admin.firestore();

const queueApi = express.Router();

// Join 9x9 queue
queueApi.post("/queue/9/join", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      const uid = req.authId;
      const user = db.collection("status").doc(uid);
      let presence = await user.get();
      // Check if user exists
      if (!presence.exists) {
        throw Error(`User ${uid} does not exist!`);
      }
      // Check if user is online
      if (presence.data().state === "offline") {
        console.log(`Warning: User ${uid} is offline!`);
      }

      const userData = (await db.collection("users").doc(uid).get()).data();

      await db
        .collection("queue_9")
        .doc("/" + uid + "/")
        .create({
          elo: userData.elo,
          created_at: Date.now(),
        })
        .then(console.log(`Player ${uid} joined 9x9 queue!`));
      return res.status(200).send({ success: "Joined 9x9 queue!" });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error });
    }
  })();
});

// Quit 9x9 queue
queueApi.delete("/queue/9/remove", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      const player = db.collection("queue_9").doc(req.authId);
      await player.delete();
      return res.status(200).send({ success: "Removed from 9x9 queue." });
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

module.exports = queueApi;
