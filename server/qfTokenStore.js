const { getDb } = require("./firebaseAdmin");

const COLLECTION = "qfSessions";

function getSessionDoc(uid) {
  const db = getDb();
  return db.collection(COLLECTION).doc(uid);
}

async function setUserSession(uid, session) {
  const ref = getSessionDoc(uid);

  await ref.set(
    {
      ...session,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

async function getUserSession(uid) {
  const ref = getSessionDoc(uid);
  const snap = await ref.get();

  if (!snap.exists) return null;
  return snap.data();
}

async function clearUserSession(uid) {
  const ref = getSessionDoc(uid);
  await ref.delete();
}

async function hasUserSession(uid) {
  const session = await getUserSession(uid);
  return !!session?.access_token;
}

module.exports = {
  setUserSession,
  getUserSession,
  clearUserSession,
  hasUserSession,
};
