const express = require("express");
const auth = require("../middleware/auth");
const { getReadingStreakForUser } = require("../services/readingStreakService");

const router = express.Router();

// GET /api/users/me/streak - Get current user's reading streak
router.get("/me/streak", auth, async (req, res) => {
  try {
    const streak = await getReadingStreakForUser(req.userId);
    res.json({ streak });
  } catch (error) {
    console.error("Get user streak error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
