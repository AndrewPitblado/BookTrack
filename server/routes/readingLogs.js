const express = require("express");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const { ReadingLog, UserBook } = require("../models");

const router = express.Router();

function asPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalDate(value, asEndOfDay = false) {
  if (!value) {
    return null;
  }

  // Accept YYYY-MM-DD by normalizing to UTC day bounds.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const suffix = asEndOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    const parsed = new Date(`${value}${suffix}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// GET /api/reading-logs - Get reading logs for current user
router.get("/", auth, async (req, res) => {
  try {
    const { userBookId, from, to } = req.query;

    const where = { userId: req.userId };

    if (userBookId !== undefined) {
      const parsedUserBookId = asPositiveInt(userBookId);
      if (!parsedUserBookId) {
        return res
          .status(400)
          .json({ message: "userBookId must be a positive integer" });
      }
      where.userBookId = parsedUserBookId;
    }

    if (from !== undefined || to !== undefined) {
      const fromDate = parseOptionalDate(from);
      const toDate = parseOptionalDate(to, true);

      if ((from !== undefined && !fromDate) || (to !== undefined && !toDate)) {
        return res.status(400).json({ message: "from/to must be valid dates" });
      }

      where.loggedAt = {};
      if (fromDate) {
        where.loggedAt[Op.gte] = fromDate;
      }
      if (toDate) {
        where.loggedAt[Op.lte] = toDate;
      }
    }

    const logs = await ReadingLog.findAll({
      where,
      order: [["loggedAt", "DESC"]],
    });

    res.json({ logs });
  } catch (error) {
    console.error("Get reading logs error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/reading-logs - Create a reading log
router.post("/", auth, async (req, res) => {
  try {
    const { userBookId, pagesRead, startPage, endPage, loggedAt } = req.body;

    const normalizedUserBookId = asPositiveInt(userBookId);
    if (!normalizedUserBookId) {
      return res.status(400).json({ message: "userBookId is required" });
    }

    const normalizedPagesRead = asPositiveInt(pagesRead);
    if (!normalizedPagesRead) {
      return res
        .status(400)
        .json({ message: "pagesRead must be a positive integer" });
    }

    const normalizedStartPage =
      startPage === undefined || startPage === null || startPage === ""
        ? null
        : Number(startPage);
    const normalizedEndPage =
      endPage === undefined || endPage === null || endPage === ""
        ? null
        : Number(endPage);

    if (
      (normalizedStartPage !== null &&
        (!Number.isInteger(normalizedStartPage) || normalizedStartPage < 0)) ||
      (normalizedEndPage !== null &&
        (!Number.isInteger(normalizedEndPage) || normalizedEndPage < 0))
    ) {
      return res
        .status(400)
        .json({ message: "startPage/endPage must be non-negative integers" });
    }

    if (
      normalizedStartPage !== null &&
      normalizedEndPage !== null &&
      normalizedEndPage < normalizedStartPage
    ) {
      return res
        .status(400)
        .json({
          message: "endPage must be greater than or equal to startPage",
        });
    }

    const userBook = await UserBook.findOne({
      where: {
        id: normalizedUserBookId,
        userId: req.userId,
      },
    });

    if (!userBook) {
      return res.status(404).json({ message: "User book not found" });
    }

    const normalizedLoggedAt = parseOptionalDate(loggedAt);
    if (
      loggedAt !== undefined &&
      loggedAt !== null &&
      loggedAt !== "" &&
      !normalizedLoggedAt
    ) {
      return res.status(400).json({ message: "loggedAt must be a valid date" });
    }

    const log = await ReadingLog.create({
      userId: req.userId,
      userBookId: userBook.id,
      bookId: userBook.bookId,
      pagesRead: normalizedPagesRead,
      startPage: normalizedStartPage,
      endPage: normalizedEndPage,
      loggedAt: normalizedLoggedAt || new Date(),
    });

    res.status(201).json({
      log,
      message: "Reading log created",
    });
  } catch (error) {
    console.error("Create reading log error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
