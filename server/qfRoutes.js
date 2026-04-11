require("dotenv").config();

const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const {
  getQfConfig,
  exchangeCodeForTokens,
  getValidAccessToken,
} = require("./qfAuth");
const {
  hasUserSession,
  clearUserSession,
  setUserSession,
} = require("./qfTokenStore");

const router = express.Router();

function getUserApiBase() {
  return "https://apis-prelive.quran.foundation/auth/v1";
}

function requireUid(req, res, next) {
  const uid = req.header("x-user-id");

  if (!uid) {
    return res.status(401).json({
      success: false,
      message: "Missing x-user-id header.",
    });
  }

  req.uid = uid;
  next();
}

async function qfRequest(uid, config) {
  const accessToken = await getValidAccessToken(uid);
  const { clientId } = getQfConfig();

  return axios({
    ...config,
    headers: {
      ...(config.headers || {}),
      "x-auth-token": accessToken,
      "x-client-id": clientId,
    },
  });
}

router.get("/auth/status", requireUid, async (req, res) => {
  try {
    const connected = await hasUserSession(req.uid);
    const { clientId } = getQfConfig();

    return res.json({
      success: true,
      connected,
      clientId: clientId || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/auth/exchange", requireUid, async (req, res) => {
  try {
    const { code, codeVerifier, redirectUri, nonce } = req.body || {};

    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({
        success: false,
        message: "code, codeVerifier, and redirectUri are required.",
      });
    }

    const tokenData = await exchangeCodeForTokens({
      code,
      codeVerifier,
      redirectUri,
    });

    let decodedIdToken = null;
    if (tokenData.id_token) {
      decodedIdToken = jwt.decode(tokenData.id_token) || null;
    }

    if (nonce && decodedIdToken?.nonce && decodedIdToken.nonce !== nonce) {
      return res.status(403).json({
        success: false,
        message: "Invalid nonce.",
      });
    }

    await setUserSession(req.uid, {
      ...tokenData,
      expires_at: Date.now() + Number(tokenData.expires_in || 3600) * 1000,
      qf_sub: decodedIdToken?.sub || null,
      qf_profile: decodedIdToken || null,
    });

    return res.json({
      success: true,
      connected: true,
      profile: decodedIdToken || null,
    });
  } catch (error) {
    console.error("QF exchange error:", error?.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Quran Foundation token exchange failed.",
      details: error?.response?.data || null,
    });
  }
});

router.post("/auth/disconnect", requireUid, async (req, res) => {
  try {
    await clearUserSession(req.uid);

    return res.json({
      success: true,
      connected: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/reading-session", requireUid, async (req, res) => {
  try {
    const { chapterNumber, verseNumber } = req.body || {};

    if (!chapterNumber || !verseNumber) {
      return res.status(400).json({
        success: false,
        message: "chapterNumber and verseNumber are required.",
      });
    }

    const response = await qfRequest(req.uid, {
      method: "POST",
      url: `${getUserApiBase()}/reading-sessions`,
      data: {
        chapterNumber: Number(chapterNumber),
        verseNumber: Number(verseNumber),
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error(
      "QF reading-session save error:",
      error?.response?.data || error.message,
    );

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not save reading session.",
      details: error?.response?.data || null,
    });
  }
});

router.get("/reading-session", requireUid, async (req, res) => {
  try {
    const response = await qfRequest(req.uid, {
      method: "GET",
      url: `${getUserApiBase()}/reading-sessions`,
      params: {
        first: 1,
      },
    });

    const payload = response.data || {};

    console.log("QF RAW RESPONSE:", payload);

    if (!payload || !payload.data || payload.data.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: "No reading session yet",
      });
    }

    const latest = payload.data[0];

    return res.json({
      success: true,
      data: latest,
      pagination: payload.pagination || null,
    });
  } catch (error) {
    console.error(
      "QF reading-session fetch error:",
      error?.response?.data || error.message,
    );

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not fetch reading session.",
      details: error?.response?.data || null,
    });
  }
});

module.exports = router;
