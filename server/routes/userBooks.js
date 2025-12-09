const express = require('express');
const { UserBook, Book, ReadHistory, Author } = require('../models');
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

    const userBooks = await UserBook.findAll({
      where,
      include: [{ 
        model: Book,
        include: [{ model: Author, as: 'authors', through: { attributes: [] } }]
      }],
      order: [['updatedAt', 'DESC']],
    });

    // For finished books, fetch their ReadHistory to get rating and notes
    const userBooksWithHistory = await Promise.all(userBooks.map(async (userBook) => {
      const bookData = userBook.toJSON();
      if (userBook.status === 'finished') {
        const readHistory = await ReadHistory.findOne({
          where: {
            userId: req.userId,
            bookId: userBook.bookId
          },
          order: [['endDate', 'DESC']]
        });
        if (readHistory) {
          bookData.rating = readHistory.rating;
          bookData.notes = readHistory.notes;
          bookData.readHistoryId = readHistory.id;
        }
      }
      return bookData;
    }));

    res.json({ userBooks: userBooksWithHistory });
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
    const existing = await UserBook.findOne({
      where: { userId: req.userId, bookId },
    });

    if (existing) {
      return res.status(400).json({ message: 'Book already in your list' });
    }

    const userBook = await UserBook.create({
      userId: req.userId,
      bookId,
      status,
      startDate: startDate || new Date(),
    });

    const userBookWithDetails = await UserBook.findByPk(userBook.id, {
      include: [{ 
        model: Book,
        include: [{ model: Author, as: 'authors', through: { attributes: [] } }]
      }],
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
    const { status, startDate, endDate, currentPage, rating, notes } = req.body;

    const userBook = await UserBook.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ 
        model: Book,
        include: [{ model: Author, as: 'authors', through: { attributes: [] } }]
      }],
    });

    if (!userBook) {
      return res.status(404).json({ message: 'Book not found in your list' });
    }

    const previousStatus = userBook.status;

    // Update fields
    if (status) userBook.status = status;
    if (startDate) userBook.startDate = startDate;
    if (endDate) userBook.endDate = endDate;
    if (currentPage !== undefined) userBook.currentPage = currentPage;

    // If marked as finished, set endDate and create/update read history
    if (status === 'finished' && previousStatus !== 'finished') {
      userBook.endDate = endDate || new Date();
      
      // Add to read history with rating and notes
      await ReadHistory.create({
        userId: req.userId,
        bookId: userBook.bookId,
        startDate: userBook.startDate,
        endDate: userBook.endDate,
        rating: rating || null,
        notes: notes || null,
      });
    } else if ((previousStatus === 'finished' || userBook.status === 'finished') && (rating !== undefined || notes !== undefined)) {
      // If already finished, update the read history with new rating/notes
      const readHistory = await ReadHistory.findOne({
        where: {
          userId: req.userId,
          bookId: userBook.bookId
        },
        order: [['endDate', 'DESC']]
      });
      
      if (readHistory) {
        if (rating !== undefined) readHistory.rating = rating;
        if (notes !== undefined) readHistory.notes = notes;
        await readHistory.save();
      }
    }

    await userBook.save();

    // Fetch updated book with rating and notes
    const userBookData = userBook.toJSON();
    if (userBook.status === 'finished') {
      const readHistory = await ReadHistory.findOne({
        where: {
          userId: req.userId,
          bookId: userBook.bookId
        },
        order: [['endDate', 'DESC']]
      });
      if (readHistory) {
        userBookData.rating = readHistory.rating;
        userBookData.notes = readHistory.notes;
        userBookData.readHistoryId = readHistory.id;
      }
    }

    res.json({ userBook: userBookData, message: 'Book status updated' });
  } catch (error) {
    console.error('Update user book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/user-books/:id - Remove book from list
router.delete('/:id', auth, async (req, res) => {
  try {
    const userBook = await UserBook.findOne({
      where: { id: req.params.id, userId: req.userId },
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

// GET /api/user-books/history - Get read history
router.get('/history', auth, async (req, res) => {
  try {
    const history = await ReadHistory.findAll({
      where: { userId: req.userId },
      include: [{ model: Book }],
      order: [['endDate', 'DESC']],
    });

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
