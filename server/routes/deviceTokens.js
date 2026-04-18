const express = require("express");
const { DeviceToken } = require("../models");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// POST /api/device-tokens - Register a device token
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Upsert: if token exists for another user, reassign it
    const existing = await DeviceToken.findOne({ where: { token } });

    if (existing) {
      if (existing.userId !== req.user.id) {
        existing.userId = req.user.id;
        existing.platform = platform || "ios";
        await existing.save();
      }
      return res.json({ message: "Device token registered" });
    }

    await DeviceToken.create({
      userId: req.user.id,
      token,
      platform: platform || "ios",
    });

    res.status(201).json({ message: "Device token registered" });
  } catch (error) {
    console.error("Error registering device token:", error);
    res.status(500).json({ message: "Error registering device token" });
  }
});

// DELETE /api/device-tokens - Unregister a device token (on logout)
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    await DeviceToken.destroy({
      where: { token, userId: req.user.id },
    });

    res.json({ message: "Device token removed" });
  } catch (error) {
    console.error("Error removing device token:", error);
    res.status(500).json({ message: "Error removing device token" });
  }
});

module.exports = router;
