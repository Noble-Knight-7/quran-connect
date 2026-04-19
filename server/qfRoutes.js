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

router.get("/streak/current", requireUid, async (req, res) => {
  try {
    const timezone = req.header("x-timezone") || "UTC";

    const response = await qfRequest(req.uid, {
      method: "GET",
      url: `${getUserApiBase()}/streaks/current-days`,
      params: {
        type: "QURAN",
      },
      headers: {
        "x-timezone": timezone,
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error(
      "QF current streak error:",
      error?.response?.data || error.message,
    );

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not fetch current streak.",
      details: error?.response?.data || null,
    });
  }
});

router.get("/activity-days", requireUid, async (req, res) => {
  try {
    const timezone = req.header("x-timezone") || "UTC";
    const { from, to, first = 100, after } = req.query;

    const response = await qfRequest(req.uid, {
      method: "GET",
      url: `${getUserApiBase()}/activity-days`,
      params: {
        type: "QURAN",
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(first ? { first } : {}),
        ...(after ? { after } : {}),
      },
      headers: {
        "x-timezone": timezone,
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error(
      "QF activity days fetch error:",
      error?.response?.data || error.message,
    );

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not fetch activity days.",
      details: error?.response?.data || null,
    });
  }
});

router.post("/activity-day", requireUid, async (req, res) => {
  try {
    const timezone = req.header("x-timezone") || "UTC";
    const { date, seconds, ranges, mushafId = 4 } = req.body || {};

    if (
      typeof seconds !== "number" &&
      (!Array.isArray(ranges) || ranges.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide seconds or ranges.",
      });
    }

    const response = await qfRequest(req.uid, {
      method: "POST",
      url: `${getUserApiBase()}/activity-days`,
      headers: {
        "x-timezone": timezone,
      },
      data: {
        type: "QURAN",
        mushafId,
        ...(date ? { date } : {}),
        ...(typeof seconds === "number" ? { seconds } : {}),
        ...(Array.isArray(ranges) ? { ranges } : {}),
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error(
      "QF activity day save error:",
      error?.response?.data || error.message,
    );

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not save activity day.",
      details: error?.response?.data || null,
    });
  }
});

// ── Bookmarks ─────────────────────────────────────────────────────────────────

router.get("/bookmarks", requireUid, async (req, res) => {
  try {
    const response = await qfRequest(req.uid, {
      method: "GET",
      url: `${getUserApiBase()}/bookmarks`,
    });
    return res.json(response.data);
  } catch (error) {
    console.error(
      "QF bookmarks fetch error:",
      error?.response?.data || error.message,
    );
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not fetch bookmarks.",
      details: error?.response?.data || null,
    });
  }
});

router.post("/bookmarks", requireUid, async (req, res) => {
  try {
    const { verseKey } = req.body || {};

    if (!verseKey) {
      return res.status(400).json({
        success: false,
        message: "verseKey is required.",
      });
    }

    const response = await qfRequest(req.uid, {
      method: "POST",
      url: `${getUserApiBase()}/bookmarks`,
      data: { verseKey },
    });

    return res.json(response.data);
  } catch (error) {
    console.error(
      "QF bookmark add error:",
      error?.response?.data || error.message,
    );
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not add bookmark.",
      details: error?.response?.data || null,
    });
  }
});

router.delete("/bookmarks/:verseKey", requireUid, async (req, res) => {
  try {
    const { verseKey } = req.params;

    const response = await qfRequest(req.uid, {
      method: "DELETE",
      url: `${getUserApiBase()}/bookmarks/${encodeURIComponent(verseKey)}`,
    });

    return res.json(response.data);
  } catch (error) {
    console.error(
      "QF bookmark delete error:",
      error?.response?.data || error.message,
    );
    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Could not remove bookmark.",
      details: error?.response?.data || null,
    });
  }
});

module.exports = router;
