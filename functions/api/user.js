const express = require("express");
const admin = require("../env/firebase");
const { firebaseConfig } = require("firebase-functions");
const db = admin.firestore();

const userApi = express.Router();

// Create user
userApi.post("/user/create", (req, res) => {
  (async () => {
    try {
      await db
        .collection("users")
        .doc("/" + req.body.uid + "/")
        .create({
          email: req.body.email,
          profile_picture: req.body.profile_picture,
          locale: req.body.locale,
          nickname: req.body.nickname,
          elo: req.body.elo,
          created_at: Date.now(),
        })
        .then(console.log(`Created user ${req.body.nickname}`));
      return res
        .status(200)
        .send(
          JSON.stringify({ success: `User ${req.body.nickname} created.` })
        );
    } catch (error) {
      console.log(error);
      return res.status(500).send(JSON.stringify(error));
    }
  })();
});

module.exports = userApi;
