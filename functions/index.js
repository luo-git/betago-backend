const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const db = require("./env/firebase");

// Create main app api
const api = express();
const static = express();

// Use cors routing
api.use(cors({ origin: true }));

// Publish static files
static.use("/", express.static("public"));

// User API
const userApi = require("./api/user");
api.use(userApi);

// Games API
const gameApi = require("./api/game");
api.use(gameApi);

// Queue API
const queueApi = require("./api/queue");
api.use(queueApi);

// Functions
const updateFirestore = require("./functions/updateFirestore");
const matchmaking = require("./functions/matchmaking");

// Export API
exports.api = functions.https.onRequest(api);
exports.static = functions.https.onRequest(static);

// Export functions
exports.updateFirestore = updateFirestore.onUserStatusChanged;
exports.matchPlayer = matchmaking.matchPlayer;
