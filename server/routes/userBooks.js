const express = require('express');
const { UserProgress, Book } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/user-books - Get all books for current user
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = { userId: req.userId };
    if (status) {
      where.status = status;
    }

    const userBooks = await UserProgress.findAll({
      where,
      include: [{ model: Book }],
    });

    res.json({ userBooks });
  } catch (error) {
    console.error('Get user books error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/user-books - Add a book to user's list
router.post('/', auth, async (req, res) => {
  try {
    const { bookId, status = 'reading', startDate } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: 'Book ID is required' });
    }

    // Check if already in user's list
    const existing = await UserProgress.findOne({
      where: { userId: req.userId, bookId },
    });

    if (existing) {
      return res.status(400).json({ message: 'Book already in your list' });
    }

    const userBook = await UserProgress.create({
      userId: req.userId,
      bookId,
      status,
    });

    const userBookWithDetails = await UserProgress.findOne({
      where: { userId: req.userId, bookId },
      include: [{ model: Book }],
    });

    res.status(201).json({ userBook: userBookWithDetails });
  } catch (error) {
    console.error('Add user book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/user-books/:id - Update book status
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, currentPage, totalPages } = req.body;
    const bookId = req.params.id; // Since we don't have a unique ID, we use bookId from URL

    const userBook = await UserProgress.findOne({
      where: { bookId, userId: req.userId },
      include: [{ model: Book }],
    });

    if (!userBook) {
      return res.status(404).json({ message: 'Book not found in your list' });
    }

    // Update fields
    if (status) userBook.status = status;
    if (currentPage) userBook.currentPage = currentPage;
    if (totalPages) userBook.totalPages = totalPages;

    await userBook.save();

    res.json({ userBook, message: 'Book status updated' });
  } catch (error) {
    console.error('Update user book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/user-books/:id - Remove book from list
router.delete('/:id', auth, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userBook = await UserProgress.findOne({
      where: { bookId, userId: req.userId },
    });

    if (!userBook) {
      return res.status(404).json({ message: 'Book not found in your list' });
    }

    await userBook.destroy();

    res.json({ message: 'Book removed from your list' });
  } catch (error) {
    console.error('Delete user book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
