const express = require("express");
const admin = require("../env/firebase");
const { firebaseConfig } = require("firebase-functions");
const checkIfAuthenticated = require("../middleware/checkUserAuth");
const db = admin.firestore();

const userApi = express.Router();

// Create user
userApi.post("/user/create", (req, res) => {
  (async () => {
    try {
      // Create user data
      await db
        .collection("users")
        .doc(req.body.uid)
        .create({
          email: req.body.email,
          profile_picture: req.body.profile_picture,
          locale: req.body.locale,
          nickname: req.body.nickname,
          elo: req.body.elo,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          games_played: 0,
          num_wins: 0,
        })
        .then(console.log(`Created user ${req.body.nickname}`));

      // Create user game record
      await db.collection("records").doc(req.body.uid).create({ record: [] });
      return res
        .status(200)
        .send(
          JSON.stringify({ success: `User ${req.body.nickname} created.` })
        );
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Fetch user details
userApi.get("/user/:uid", (req, res) => {
  (async () => {
    try {
      const userRef = db.collection("users").doc(req.params.uid);
      let user = await userRef.get();
      if (!user.exists) {
        throw Error(`User ${req.params.uid} does not exist`);
      }
      let response = user.data();
      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Fetch user's completed games
userApi.get("/user/:uid/games", (req, res) => {
  (async () => {
    try {
      const gamesRef = db.collection("records").doc(req.params.uid);
      let games = await gamesRef.get();
      if (!games.exists) {
        throw Error(`User ${req.params.uid} does not exist`);
      }
      let response = games.data();
      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

// Update user profile
userApi.post("/user/:uid/update", checkIfAuthenticated, (req, res) => {
  (async () => {
    try {
      let updated = false;

      // Check for consistency in user auth token
      if (req.authId !== req.params.uid) {
        throw Error("User ID does not match auth token!");
      }
      const userRef = db.collection("users").doc(req.params.uid);

      // Update profile picture
      if (req.body.profile_picture !== undefined) {
        console.log("Update profile picture!");
        await userRef
          .update({ profile_picture: req.body.profile_picture })
          .then(() =>
            console.log(`User ${req.params.uid} updated profile picture`)
          );
        updated = true;
      }

      // Update nickname
      if (req.body.nickname !== undefined) {
        await userRef
          .update({ nickname: req.body.nickname })
          .then(() =>
            console.log(
              `User ${req.params.uid} updated nickname to ${req.body.nickname}`
            )
          );
        updated = true;
      }

      // Update introduction
      if (req.body.intro !== undefined) {
        await userRef
          .update({ intro: req.body.intro })
          .then(() =>
            console.log(`User ${req.params.uid} updated self intro!`)
          );
        updated = true;
      }

      // Throw error if no updatable body data is found
      if (!updated) {
        throw Error("Nothing to update!");
      }

      return res.status(200).send({ success: "Updated profile!" });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: error.message });
    }
  })();
});

module.exports = userApi;
