const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let dbInstance = null;
let initState = {
  attempted: false,
  configured: false,
  error: null,
};

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
  }

  const keyPath = path.join(__dirname, "serviceAccountKey.json");

  if (fs.existsSync(keyPath)) {
    try {
      return JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    } catch (error) {
      throw new Error("server/serviceAccountKey.json is not valid JSON");
    }
  }

  throw new Error(
    "Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or add server/serviceAccountKey.json",
  );
}

function initFirebaseAdmin() {
  if (initState.attempted) {
    return initState;
  }

  initState.attempted = true;

  try {
    if (!admin.apps.length) {
      const serviceAccount = loadServiceAccount();

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    dbInstance = admin.firestore();
    initState.configured = true;
    initState.error = null;
  } catch (error) {
    dbInstance = null;
    initState.configured = false;
    initState.error = error;
  }

  return initState;
}

function getDb() {
  const state = initFirebaseAdmin();

  if (!state.configured || !dbInstance) {
    const error =
      state.error ||
      new Error("Firebase Admin is not configured correctly on the server.");
    throw error;
  }

  return dbInstance;
}

function getFirebaseStatus() {
  const state = initFirebaseAdmin();

  return {
    configured: state.configured,
    error: state.error ? state.error.message : null,
  };
}

module.exports = {
  admin,
  getDb,
  getFirebaseStatus,
};
