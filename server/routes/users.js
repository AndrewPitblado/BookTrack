const express = require("express");
const auth = require("../middleware/auth");
const { getReadingStreakForUser } = require("../services/readingStreakService");
const { UserBook, Book } = require("../models");

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

module.exports = router;
