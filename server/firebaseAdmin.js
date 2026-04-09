const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    );
    credential = admin.credential.cert(serviceAccount);
  } else {
    const localPath = path.join(__dirname, "serviceAccountKey.json");

    if (!fs.existsSync(localPath)) {
      throw new Error(
        "Missing Firebase Admin credentials. Add FIREBASE_SERVICE_ACCOUNT_JSON or create server/serviceAccountKey.json",
      );
    }

    const serviceAccount = require(localPath);
    credential = admin.credential.cert(serviceAccount);
  }

  admin.initializeApp({ credential });
}

const db = admin.firestore();

module.exports = { admin, db };
