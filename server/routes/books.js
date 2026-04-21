const express = require("express");
const axios = require("axios");
const { Book, Author } = require("../models");
const auth = require("../middleware/auth");

const router = express.Router();

async function fetchGoogleBooks(url) {
  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios.get(url, { timeout: 8000 });
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const isTransient = !status || status >= 500;
      if (!isTransient || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw lastError;
}

// GET /api/books/search - Search Google Books API
router.get("/search", auth, async (req, res) => {
  try {
    const { q, author, genre, maxResults = 20 } = req.query;

    if (!q && !author && !genre) {
      return res
        .status(400)
        .json({ message: "Search query or author/Genre is required" });
    }

    // Build search query
    let searchQuery = "";
    if (author) {
      searchQuery = `inauthor:${author}`;
    } else if (genre) {
      searchQuery = `subject:${genre}`;
    } else {
      searchQuery = q;
    }

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}`;

    if (apiKey && apiKey !== "google_books_api_key") {
      url += `&key=${apiKey}`;
    }

    const response = await fetchGoogleBooks(url);

    const books = (response.data.items || []).map((item) => ({
      googleBooksId: item.id,
      title: item.volumeInfo.title,
      authors: item.volumeInfo.authors || [],
      description: item.volumeInfo.description || "",
      thumbnail: item.volumeInfo.imageLinks?.thumbnail || null,
      pageCount: item.volumeInfo.pageCount || null,
      publishedDate: item.volumeInfo.publishedDate || null,
      categories: item.volumeInfo.categories || [],
    }));

    res.json({ books });
  } catch (error) {
    const upstreamStatus = error.response?.status;
    const upstreamMessage = error.response?.data?.error?.message;

    console.error("Google Books search error:", {
      status: upstreamStatus,
      message: upstreamMessage || error.message,
    });

    if (upstreamStatus) {
      const status = upstreamStatus >= 500 ? 502 : upstreamStatus;
      return res.status(status).json({
        message: upstreamMessage || "Error searching books",
      });
    }

    return res.status(500).json({ message: "Error searching books" });
  }
});

// GET /api/books/:id - Get book by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ book });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/books - Add a book (from Google Books data)
router.post("/", auth, async (req, res) => {
  try {
    const {
      googleBooksId,
      title,
      authors,
      description,
      thumbnail,
      pageCount,
      publishedDate,
      categories,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Check if book already exists by googleBooksId
    if (googleBooksId) {
      const existingBook = await Book.findOne({
        where: { googleBooksId },
        include: [
          { model: Author, as: "authors", through: { attributes: [] } },
        ],
      });
      if (existingBook) {
        return res.json({ book: existingBook, message: "Book already exists" });
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
      include: [{ model: Author, as: "authors", through: { attributes: [] } }],
    });

    res
      .status(201)
      .json({ book: bookWithAuthors, message: "Book added successfully" });
  } catch (error) {
    console.error("Add book error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
