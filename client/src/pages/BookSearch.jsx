import { useState } from 'react';
import api from '../services/api';
import './BookSearch.css';

const BookSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [message, setMessage] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const params = {};
      if (searchQuery) params.q = searchQuery;
      if (authorQuery) params.author = authorQuery;
      
      const response = await api.get('/books/search', { params });
      setResults(response.data.books || []);
    } catch (err) {
      console.error('Search error:', err);
      setMessage('Failed to search books');
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (book) => {
    setAddingId(book.googleBooksId);
    setMessage('');

    try {
      // First, add or find the book in our database
      const bookResponse = await api.post('/books', book);
      const savedBook = bookResponse.data.book;

      // Then add to user's list
      await api.post('/user-books', {
        bookId: savedBook.id,
        status: 'reading',
      });

      setMessage(`"${book.title}" added to your library!`);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Error adding book';
      setMessage(errMsg);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="book-search">
      <h1>Search Books</h1>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input
          type="text"
          placeholder="Search by author..."
          value={authorQuery}
          onChange={(e) => setAuthorQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {message && <div className="message">{message}</div>}

      <div className="search-results">
        {results.map((book) => (
          <div key={book.googleBooksId} className="result-card">
            {book.thumbnail && (
              <img src={book.thumbnail} alt={book.title} />
            )}
            <div className="result-info">
              <h3>{book.title}</h3>
              <p className="authors">{book.authors?.join(', ') || 'Unknown Author'}</p>
              {book.pageCount && <p className="pages">{book.pageCount} pages</p>}
              <p className="description">
                {book.description?.substring(0, 150)}
                {book.description?.length > 150 && '...'}
              </p>
              <button 
                onClick={() => addToLibrary(book)}
                disabled={addingId === book.googleBooksId}
                className="btn-add"
              >
                {addingId === book.googleBooksId ? 'Adding...' : 'Add to Library'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && (searchQuery || authorQuery) && (
        <p className="no-results">No books found. Try a different search term.</p>
      )}
    </div>
  );
};

export default BookSearch;