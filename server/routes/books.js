const express = require('express');
const axios = require('axios');
const { Book, Author } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/books/search - Search Google Books API
router.get('/search', auth, async (req, res) => {
  try {
    const { q, author, maxResults = 10 } = req.query;

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

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}`;
    
    if (apiKey && apiKey !== 'google_books_api_key') {
      url += `&key=${apiKey}`;
    }

    const response = await axios.get(url);
    
    const books = (response.data.items || []).map((item) => ({
      googleBooksId: item.id,
      title: item.volumeInfo.title,
      authors: item.volumeInfo.authors || [],
      description: item.volumeInfo.description || '',
      thumbnail: item.volumeInfo.imageLinks?.thumbnail || null,
      pageCount: item.volumeInfo.pageCount || null,
      publishedDate: item.volumeInfo.publishedDate || null,
      categories: item.volumeInfo.categories || [],
    }));

    res.json({ books });
  } catch (error) {
    console.error('Google Books search error:', error);
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
      const existingBook = await Book.findOne({ 
        where: { googleBooksId },
        include: [{ model: Author, as: 'authors', through: { attributes: [] } }]
      });
      if (existingBook) {
        return res.json({ book: existingBook, message: 'Book already exists' });
      }
    }

    const book = await Book.create({
      googleBooksId,
      title,
      description,
      thumbnail,
      pageCount,
      publishedDate,
      genres: categories || [],
    });

    // Create or find authors and associate them with the book
    if (authors && authors.length > 0) {
      for (const authorName of authors) {
        const [author] = await Author.findOrCreate({
          where: { name: authorName },
        });
        await book.addAuthor(author);
      }
    }

    // Fetch the book with authors included
    const bookWithAuthors = await Book.findByPk(book.id, {
      include: [{ model: Author, as: 'authors', through: { attributes: [] } }]
    });

    res.status(201).json({ book: bookWithAuthors, message: 'Book added successfully' });
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
