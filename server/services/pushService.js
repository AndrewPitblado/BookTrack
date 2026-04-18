const http2 = require("http2");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const APNS_HOST_PROD = "https://api.push.apple.com";
const APNS_HOST_DEV = "https://api.sandbox.push.apple.com";

let cachedToken = null;
let cachedTokenExpiry = 0;

function getAPNsToken() {
  const now = Math.floor(Date.now() / 1000);

  // APNs tokens are valid for up to 60 minutes; refresh at 50 min
  if (cachedToken && now < cachedTokenExpiry) {
    return cachedToken;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const keyPath = process.env.APNS_KEY_PATH;
  const keyContents = process.env.APNS_KEY;

  if (!keyId || !teamId || (!keyPath && !keyContents)) {
    throw new Error(
      "Missing APNs configuration: APNS_KEY_ID, APNS_TEAM_ID, and APNS_KEY or APNS_KEY_PATH",
    );
  }

  // Prefer APNS_KEY env var (for platforms like Railway), fall back to file
  let key;
  if (keyContents) {
    key = keyContents.replace(/\\n/g, "\n");
  } else {
    const resolvedPath = path.resolve(keyPath);
    key = fs.readFileSync(resolvedPath, "utf8");
  }

  cachedToken = jwt.sign({}, key, {
    algorithm: "ES256",
    keyid: keyId,
    issuer: teamId,
    expiresIn: "55m",
  });
  cachedTokenExpiry = now + 50 * 60;

  return cachedToken;
}

/**
 * Send a push notification via APNs HTTP/2.
 * @param {string} deviceToken - The hex device token
 * @param {object} payload - The APNs payload ({ aps: { alert, sound, badge }, ... })
 * @param {object} [options] - Optional: { topic, expiration, priority, collapseId }
 * @returns {Promise<{ statusCode: number, deviceToken: string }>}
 */
function sendPush(deviceToken, payload, options = {}) {
  // APNS_ENVIRONMENT overrides NODE_ENV for explicit control
  const apnsEnv = process.env.APNS_ENVIRONMENT; // "production" or "sandbox"
  const isProduction =
    apnsEnv === "production" ||
    (!apnsEnv && process.env.NODE_ENV === "production");
  const host = isProduction ? APNS_HOST_PROD : APNS_HOST_DEV;
  const topic = options.topic || process.env.APNS_BUNDLE_ID;

  console.log(
    `APNs: sending to ${isProduction ? "production" : "sandbox"} for device ${deviceToken.substring(0, 8)}...`,
  );

  if (!topic) {
    return Promise.reject(new Error("Missing APNS_BUNDLE_ID"));
  }

  return new Promise((resolve, reject) => {
    let token;
    try {
      token = getAPNsToken();
    } catch (err) {
      return reject(err);
    }

    const client = http2.connect(host);

    client.on("error", (err) => {
      client.close();
      reject(err);
    });

    const headers = {
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": String(options.priority || 10),
    };

    if (options.expiration !== undefined) {
      headers["apns-expiration"] = String(options.expiration);
    }
    if (options.collapseId) {
      headers["apns-collapse-id"] = options.collapseId;
    }

    const req = client.request(headers);

    let responseData = "";
    let statusCode;

    req.on("response", (hdrs) => {
      statusCode = hdrs[":status"];
    });

    req.on("data", (chunk) => {
      responseData += chunk;
    });

    req.on("end", () => {
      client.close();
      if (statusCode === 200) {
        resolve({ statusCode, deviceToken });
      } else {
        const body = responseData ? JSON.parse(responseData) : {};
        reject(
          Object.assign(
            new Error(`APNs error ${statusCode}: ${body.reason || "unknown"}`),
            { statusCode, reason: body.reason, deviceToken },
          ),
        );
      }
    });

    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.end(JSON.stringify(payload));
  });
}

/**
 * Send a notification to all device tokens for a given user.
 * Automatically removes invalid tokens (Unregistered / BadDeviceToken).
 */
async function sendToUser(userId, payload, options = {}) {
  const { DeviceToken } = require("../models");

  const tokens = await DeviceToken.findAll({ where: { userId } });
  if (tokens.length === 0) {
    console.log(`APNs: no device tokens found for user ${userId}, skipping`);
    return [];
  }

  console.log(`APNs: sending to ${tokens.length} device(s) for user ${userId}`);

  const results = await Promise.allSettled(
    tokens.map((t) => sendPush(t.token, payload, options)),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      console.log(
        `APNs: push sent successfully to ${result.value.deviceToken.substring(0, 8)}...`,
      );
    } else {
      console.error(
        `APNs: push failed - ${result.reason?.message || result.reason}`,
      );
    }
  }

  // Clean up invalid tokens
  const invalidReasons = new Set(["Unregistered", "BadDeviceToken"]);
  for (const result of results) {
    if (
      result.status === "rejected" &&
      invalidReasons.has(result.reason?.reason)
    ) {
      await DeviceToken.destroy({
        where: { token: result.reason.deviceToken },
      });
      console.log(
        `Removed invalid device token for user ${userId}: ${result.reason.reason}`,
      );
    }
  }

  return results;
}

module.exports = { sendPush, sendToUser };
