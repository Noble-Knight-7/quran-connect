const admin = require("firebase-admin");

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!raw) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
    }

    let serviceAccount;

    try {
      serviceAccount = JSON.parse(raw);
    } catch (error) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  dbInstance = admin.firestore();
  return dbInstance;
}

module.exports = { admin, getDb };
