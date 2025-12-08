const express = require('express');
const { Op } = require('sequelize');
const { Book } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/books/search - Search Local Database
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q && !author) {
      return res.status(400).json({ message: 'Search query or author is required' });
    }

    // Build search query
    let searchQuery = '';
    if (author) {
      searchQuery = `inauthor:${author}`;
    } else {
      searchQuery = q;
    }

    const books = await Book.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${q}%` } },
          { authors: { [Op.like]: `%${q}%` } },
          { isbn: { [Op.like]: `%${q}%` } }
        ]
      },
      limit: 20
    });

    res.json({ books });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error searching books' });
  }
});

// GET /api/books/:id - Get book by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ book });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/books - Add a book (from Google Books data)
router.post('/', auth, async (req, res) => {
  try {
    const { googleBooksId, title, authors, description, thumbnail, pageCount, publishedDate, categories } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Check if book already exists by googleBooksId
    if (googleBooksId) {
      const existingBook = await Book.findOne({ where: { googleBooksId } });
      if (existingBook) {
        return res.json({ book: existingBook, message: 'Book already exists' });
      }
    }

    const book = await Book.create({
      googleBooksId,
      title,
      authors: authors || [],
      description,
      thumbnail,
      pageCount,
      publishedDate,
      categories: categories || [],
    });

    res.status(201).json({ book, message: 'Book added successfully' });
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
