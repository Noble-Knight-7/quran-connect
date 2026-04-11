require("dotenv").config();

const axios = require("axios");
const { getUserSession, setUserSession } = require("./qfTokenStore");

function getQfConfig() {
  const tokenHost =
    process.env.QF_TOKEN_HOST || "https://prelive-oauth2.quran.foundation";
  const clientId = (process.env.QF_CLIENT_ID || "").trim();
  const clientSecret = (process.env.QF_CLIENT_SECRET || "").trim();

  return {
    tokenHost,
    clientId,
    clientSecret,
  };
}

const debugConfig = getQfConfig();
console.log("QF auth config loaded:", {
  tokenHost: debugConfig.tokenHost,
  clientIdPresent: Boolean(debugConfig.clientId),
  clientSecretPresent: Boolean(debugConfig.clientSecret),
  clientIdLength: debugConfig.clientId.length,
  clientSecretLength: debugConfig.clientSecret.length,
});

async function exchangeCodeForTokens({ code, codeVerifier, redirectUri }) {
  const { tokenHost, clientId, clientSecret } = getQfConfig();

  // 1. Remove clientId and clientSecret from the body
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await axios.post(
    `${tokenHost}/oauth2/token`,
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // 2. Add Basic Authentication header here
      auth: {
        username: clientId,
        password: clientSecret,
      },
    },
  );

  return response.data;
}

async function refreshAccessToken(uid) {
  const existing = await getUserSession(uid);

  if (!existing?.refresh_token) {
    throw new Error("No refresh token available.");
  }

  const { tokenHost, clientId, clientSecret } = getQfConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: existing.refresh_token,
  });

  const response = await axios.post(
    `${tokenHost}/oauth2/token`,
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      auth: {
        username: clientId,
        password: clientSecret,
      },
    },
  );

  const refreshed = {
    ...existing,
    ...response.data,
    expires_at: Date.now() + Number(response.data.expires_in || 3600) * 1000,
  };

  await setUserSession(uid, refreshed);
  return refreshed;
}

async function getValidAccessToken(uid) {
  const session = await getUserSession(uid);

  if (!session?.access_token) {
    throw new Error("Quran Foundation session not found.");
  }

  const expiresAt = Number(session.expires_at || 0);
  const expired = !expiresAt || Date.now() > expiresAt - 60 * 1000;

  if (expired) {
    const refreshed = await refreshAccessToken(uid);
    return refreshed.access_token;
  }

  return session.access_token;
}

module.exports = {
  getQfConfig,
  exchangeCodeForTokens,
  getValidAccessToken,
};
