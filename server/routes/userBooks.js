const express = require("express");
const { UserBook, Book, ReadHistory, Author, User, Friendship } = require("../models");
const { reconcileUserAchievements } = require("../services/achievementEngine");
const {
  notifyAchievementsUnlocked,
  notifyFriendsOfAchievement,
} = require("../services/notificationService");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");

const router = express.Router();

function normalizeHalfStepRating(rating) {
  if (rating === undefined || rating === null || rating === "") {
    return null;
  }

  const numeric = Number(rating);
  if (!Number.isFinite(numeric)) {
    throw new Error("Rating must be a valid number");
  }

  if (numeric < 0.5 || numeric > 5) {
    throw new Error("Rating must be between 0.5 and 5");
  }

  const normalized = Math.round(numeric * 2) / 2;
  return Number(normalized.toFixed(1));
}

async function reconcileAchievementsForUser(userId) {
  const { newlyUnlocked, unlockedCount } = await reconcileUserAchievements(userId);

  if (unlockedCount > 0) {
    // Notify the user
    notifyAchievementsUnlocked(userId, newlyUnlocked);

    // Notify their friends
    try {
      const friendships = await Friendship.findAll({
        where: {
          [Op.or]: [{ userId }, { friendId: userId }],
          status: "accepted",
        },
      });
      const friendIds = friendships.map((f) =>
        f.userId === userId ? f.friendId : f.userId,
      );
      if (friendIds.length > 0) {
        const user = await User.findByPk(userId, { attributes: ["username"] });
        const names = newlyUnlocked.map(
          (a) => a.Achievement?.name || "an achievement",
        );
        notifyFriendsOfAchievement(userId, user.username, names, friendIds);
      }
    } catch (err) {
      console.error("Error notifying friends of achievement:", err.message);
    }
  }
}

// GET /api/user-books - Get all books for current user
router.get("/", auth, async (req, res) => {
  try {
    const { status } = req.query;

    const where = { userId: req.userId };
    if (status) {
      where.status = status;
    }

    const userBooks = await UserBook.findAll({
      where,
      include: [
        {
          model: Book,
          include: [
            { model: Author, as: "authors", through: { attributes: [] } },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    // For finished books, fetch their ReadHistory to get rating and notes
    const userBooksWithHistory = await Promise.all(
      userBooks.map(async (userBook) => {
        const bookData = userBook.toJSON();
        if (userBook.status === "finished") {
          const readHistory = await ReadHistory.findOne({
            where: {
              userId: req.userId,
              bookId: userBook.bookId,
            },
            order: [["endDate", "DESC"]],
          });
          if (readHistory) {
            bookData.rating = Number(readHistory.rating);
            bookData.notes = readHistory.notes;
            bookData.readHistoryId = readHistory.id;
          }
        }
        return bookData;
      }),
    );

    res.json({ userBooks: userBooksWithHistory });
  } catch (error) {
    console.error("Get user books error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/user-books - Add a book to user's list
router.post("/", auth, async (req, res) => {
  try {
    const {
      bookId,
      status = "reading",
      startDate,
      endDate,
      currentPage,
      rating,
      notes,
    } = req.body;

    let normalizedRating = null;
    try {
      normalizedRating = normalizeHalfStepRating(rating);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    if (!bookId) {
      return res.status(400).json({ message: "Book ID is required" });
    }

    // Check if already in user's list
    const existing = await UserBook.findOne({
      where: { userId: req.userId, bookId },
    });

    if (existing) {
      return res.status(400).json({ message: "Book already in your list" });
    }

    const userBook = await UserBook.create({
      userId: req.userId,
      bookId,
      status,
      startDate: startDate || new Date(),
      endDate: status === "finished" ? endDate || new Date() : null,
      currentPage: currentPage !== undefined ? currentPage : 0,
    });

    if (status === "finished") {
      await ReadHistory.create({
        userId: req.userId,
        bookId: userBook.bookId,
        startDate: userBook.startDate,
        endDate: userBook.endDate,
        rating: normalizedRating,
        notes: notes || null,
      });
    }

    await reconcileAchievementsForUser(req.userId);

    const userBookWithDetails = await UserBook.findByPk(userBook.id, {
      include: [
        {
          model: Book,
          include: [
            { model: Author, as: "authors", through: { attributes: [] } },
          ],
        },
      ],
    });

    const userBookResponse = userBookWithDetails.toJSON();
    if (status === "finished") {
      const readHistory = await ReadHistory.findOne({
        where: {
          userId: req.userId,
          bookId: userBook.bookId,
        },
        order: [["endDate", "DESC"]],
      });

      if (readHistory) {
        userBookResponse.rating = Number(readHistory.rating);
        userBookResponse.notes = readHistory.notes;
        userBookResponse.readHistoryId = readHistory.id;
      }
    }

    res.status(201).json({ userBook: userBookResponse });
  } catch (error) {
    console.error("Add user book error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/user-books/:id - Update book status
router.put("/:id", auth, async (req, res) => {
  try {
    const { status, startDate, endDate, currentPage, rating, notes } = req.body;

    let normalizedRating;
    try {
      normalizedRating = normalizeHalfStepRating(rating);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const userBook = await UserBook.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [
        {
          model: Book,
          include: [
            { model: Author, as: "authors", through: { attributes: [] } },
          ],
        },
      ],
    });

    if (!userBook) {
      return res.status(404).json({ message: "Book not found in your list" });
    }

    const previousStatus = userBook.status;

    // Update fields
    if (status) userBook.status = status;
    if (startDate) userBook.startDate = startDate;
    if (endDate) userBook.endDate = endDate;
    if (currentPage !== undefined) userBook.currentPage = currentPage;

    // If marked as finished, set endDate and create read history
    if (status === "finished" && previousStatus !== "finished") {
      userBook.endDate = endDate || new Date();

      // Add to read history with rating and notes
      await ReadHistory.create({
        userId: req.userId,
        bookId: userBook.bookId,
        startDate: userBook.startDate,
        endDate: userBook.endDate,
        rating: normalizedRating,
        notes: notes || null,
      });
    } else if (
      status &&
      status !== "finished" &&
      previousStatus === "finished"
    ) {
      // Reverting from finished means the read should no longer count toward achievements.
      await ReadHistory.destroy({
        where: {
          userId: req.userId,
          bookId: userBook.bookId,
        },
      });
    } else if (
      (previousStatus === "finished" || userBook.status === "finished") &&
      (rating !== undefined || notes !== undefined)
    ) {
      // If already finished, update the read history with new rating/notes
      const readHistory = await ReadHistory.findOne({
        where: {
          userId: req.userId,
          bookId: userBook.bookId,
        },
        order: [["endDate", "DESC"]],
      });

      if (readHistory) {
        if (rating !== undefined) readHistory.rating = normalizedRating;
        if (notes !== undefined) readHistory.notes = notes;
        await readHistory.save();
      }
    }

    await userBook.save();
    await reconcileAchievementsForUser(req.userId);

    // Fetch updated book with rating and notes
    const userBookData = userBook.toJSON();
    if (userBook.status === "finished") {
      const readHistory = await ReadHistory.findOne({
        where: {
          userId: req.userId,
          bookId: userBook.bookId,
        },
        order: [["endDate", "DESC"]],
      });
      if (readHistory) {
        userBookData.rating = Number(readHistory.rating);
        userBookData.notes = readHistory.notes;
        userBookData.readHistoryId = readHistory.id;
      }
    }

    res.json({ userBook: userBookData, message: "Book status updated" });
  } catch (error) {
    console.error("Update user book error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/user-books/:id - Remove book from list
router.delete("/:id", auth, async (req, res) => {
  try {
    const userBook = await UserBook.findOne({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!userBook) {
      return res.status(404).json({ message: "Book not found in your list" });
    }

    await ReadHistory.destroy({
      where: {
        userId: req.userId,
        bookId: userBook.bookId,
      },
    });

    await userBook.destroy();
    await reconcileAchievementsForUser(req.userId);

    res.json({ message: "Book removed from your list" });
  } catch (error) {
    console.error("Delete user book error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/user-books/history - Get read history
router.get("/history", auth, async (req, res) => {
  try {
    const history = await ReadHistory.findAll({
      where: { userId: req.userId },
      include: [{ model: Book }],
      order: [["endDate", "DESC"]],
    });

    res.json({ history });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
