const admin = require("firebase-admin");

var serviceAccount = require("./betago-29c7e-firebase-adminsdk-cj5px-166bbfe501.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://betago-29c7e.firebaseio.com",
});

module.exports = admin;
