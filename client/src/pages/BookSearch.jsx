import { useState } from 'react';
import api from '../services/api';
import './BookSearch.css';

const BookSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [message, setMessage] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await api.get(`/books/search?q=${encodeURIComponent(query)}`);
      setResults(response.data.books);
    } catch (error) {
      console.error('Search error:', error);
      setMessage('Error searching for books');
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (book) => {
    setAddingId(book.isbn);
    setMessage('');

    try {
      // The book is already in the DB, so just add to user's list
      await api.post('/user-books', {
        bookId: book.isbn,
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

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or ISBN..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {message && <div className="message">{message}</div>}

      <div className="search-results">
        {results.map((book) => (
          <div key={book.isbn} className="result-card">
            {book.thumbnail && (
              <img src={book.thumbnail} alt={book.title} />
            )}
            <div className="result-info">
              <h3>{book.title}</h3>
              <p className="authors">
                {Array.isArray(book.authors) 
                  ? book.authors.join(', ') 
                  : (book.authors || 'Unknown Author')}
              </p>
              {book.pageCount && <p className="pages">{book.pageCount} pages</p>}
              <p className="description">
                {book.description?.substring(0, 150)}
                {book.description?.length > 150 && '...'}
              </p>
              <button 
                onClick={() => addToLibrary(book)}
                disabled={addingId === book.isbn}
                className="btn-add"
              >
                {addingId === book.isbn ? 'Adding...' : 'Add to Library'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && query && (
        <p className="no-results">No books found. Try a different search term.</p>
      )}
    </div>
  );
};

export default BookSearch;
