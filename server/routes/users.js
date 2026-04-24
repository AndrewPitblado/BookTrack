const express = require("express");
const auth = require("../middleware/auth");
const { getReadingStreakForUser } = require("../services/readingStreakService");
const { AVATAR_PRESET_IDS, isValidAvatarPresetId } = require("../config/avatarPresets");
const { User, UserBook, Book } = require("../models");

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

// GET /api/users/me/stats - Get dashboard summary stats for the current user
router.get("/me/stats", auth, async (req, res) => {
  try {
    const userId = req.userId;

    const [readingCount, finishedCount, readingPagesRaw, finishedBooks] =
      await Promise.all([
        UserBook.count({ where: { userId, status: "reading" } }),
        UserBook.count({ where: { userId, status: "finished" } }),
        UserBook.sum("currentPage", { where: { userId, status: "reading" } }),
        UserBook.findAll({
          where: { userId, status: "finished" },
          include: [{ model: Book, attributes: ["pageCount"] }],
        }),
      ]);

    const readingPages = readingPagesRaw || 0;
    const finishedPages = finishedBooks.reduce(
      (sum, ub) => sum + (ub.Book?.pageCount || 0),
      0,
    );
    const totalPages = readingPages + finishedPages;

    res.json({ readingCount, finishedCount, totalPages });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/users/avatar-presets - Get selectable preset avatar IDs
router.get("/avatar-presets", auth, async (_req, res) => {
  res.json({ avatarPresets: AVATAR_PRESET_IDS });
});

// PUT /api/users/me/avatar - Set current user's avatar URL or preset avatar ID
router.put("/me/avatar", auth, async (req, res) => {
  try {
    const { avatarUrl, avatarId } = req.body || {};

    if (avatarId !== undefined && avatarId !== null && typeof avatarId !== "string") {
      return res.status(400).json({ message: "avatarId must be a string or null" });
    }

    if (
      avatarId !== undefined &&
      avatarId !== null &&
      !isValidAvatarPresetId(avatarId.trim())
    ) {
      return res.status(400).json({
        message: `avatarId must be one of: ${AVATAR_PRESET_IDS.join(", ")}`,
      });
    }

    if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== "string") {
      return res.status(400).json({ message: "avatarUrl must be a string or null" });
    }

    const trimmedAvatarUrl = typeof avatarUrl === "string" ? avatarUrl.trim() : null;
    const trimmedAvatarId = typeof avatarId === "string" ? avatarId.trim() : null;

    if (!trimmedAvatarUrl && !trimmedAvatarId) {
      return res.status(400).json({ message: "avatarId or avatarUrl is required" });
    }

    if (trimmedAvatarUrl && trimmedAvatarUrl.length > 2048) {
      return res
        .status(400)
        .json({ message: "avatarUrl must be 2048 characters or fewer" });
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.avatarUrl = trimmedAvatarUrl || null;
    user.avatarId = trimmedAvatarId || null;
    await user.save();

    res.json({
      message: "Avatar updated",
      avatarUrl: user.avatarUrl,
      avatarId: user.avatarId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatarId: user.avatarId,
      },
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/users/me/avatar - Remove current user's avatar
router.delete("/me/avatar", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.avatarUrl = null;
    user.avatarId = null;
    await user.save();

    res.json({
      message: "Avatar removed",
      avatarUrl: null,
      avatarId: null,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: null,
        avatarId: null,
      },
    });
  } catch (error) {
    console.error("Remove avatar error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
