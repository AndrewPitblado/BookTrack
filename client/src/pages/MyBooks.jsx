import { useState, useEffect } from 'react';
import api from '../services/api';
import './MyBooks.css';

const MyBooks = () => {
  const [userBooks, setUserBooks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserBooks();
  }, []);

  const fetchUserBooks = async () => {
    try {
      const response = await api.get('/user-books');
      setUserBooks(response.data.userBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/user-books/${id}`, { status: newStatus });
      fetchUserBooks(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateProgress = async (id, currentPage) => {
    try {
      await api.put(`/user-books/${id}`, { currentPage: parseInt(currentPage) });
      // Update local state
      setUserBooks(userBooks.map(book => 
        book.id === id ? { ...book, currentPage: parseInt(currentPage) } : book
      ));
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const updateRatingAndNotes = async (id, rating, notes) => {
    try {
      await api.put(`/user-books/${id}`, { rating, notes });
      // Update local state
      setUserBooks(userBooks.map(book => 
        book.id === id ? { ...book, rating, notes } : book
      ));
    } catch (error) {
      console.error('Error updating rating/notes:', error);
    }
  };

  const removeBook = async (id) => {
    if (!window.confirm('Remove this book from your list?')) return;
    
    try {
      await api.delete(`/user-books/${id}`);
      setUserBooks(userBooks.filter((b) => b.id !== id));
    } catch (error) {
      console.error('Error removing book:', error);
    }
  };

  const filteredBooks = filter === 'all' 
    ? userBooks 
    : userBooks.filter((b) => b.status === filter);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="my-books">
      <h1>My Books</h1>

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''} 
          onClick={() => setFilter('all')}
        >
          All ({userBooks.length})
        </button>
        <button 
          className={filter === 'reading' ? 'active' : ''} 
          onClick={() => setFilter('reading')}
        >
          Reading ({userBooks.filter((b) => b.status === 'reading').length})
        </button>
        <button 
          className={filter === 'finished' ? 'active' : ''} 
          onClick={() => setFilter('finished')}
        >
          Finished ({userBooks.filter((b) => b.status === 'finished').length})
        </button>
        <button 
          className={filter === 'dropped' ? 'active' : ''} 
          onClick={() => setFilter('dropped')}
        >
          Dropped ({userBooks.filter((b) => b.status === 'dropped').length})
        </button>
      </div>

      {filteredBooks.length === 0 ? (
        <p className="no-books">No books in this category.</p>
      ) : (
        <div className="books-grid">
          {filteredBooks.map((userBook) => (
            <div key={userBook.id} className="book-card">
              {userBook.Book?.thumbnail && (
                <img src={userBook.Book.thumbnail} alt={userBook.Book.title} />
              )}
              <div className="book-info">
                <h3>{userBook.Book?.title}</h3>
                <p className="authors">
                  {userBook.Book?.authors?.map(a => a.name).join(', ') || 'Unknown Author'}
                </p>
                <p className="dates">
                  Started: {userBook.startDate || 'N/A'}
                  {userBook.endDate && ` | Ended: ${userBook.endDate}`}
                </p>
                
                {userBook.status === 'reading' && userBook.Book?.pageCount && (
                  <div className="progress-section">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min((userBook.currentPage || 0) / userBook.Book.pageCount * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <div className="progress-input">
                      <label htmlFor={`page-${userBook.id}`}>Page:</label>
                      <div className="page-control">
                        <button 
                          className="page-btn page-decrement"
                          onClick={() => {
                            const newPage = Math.max(0, (userBook.currentPage || 0) - 1);
                            updateProgress(userBook.id, newPage);
                          }}
                          disabled={(userBook.currentPage || 0) === 0}
                        >
                          −
                        </button>
                        <input
                          id={`page-${userBook.id}`}
                          type="number"
                          min="0"
                          max={userBook.Book.pageCount}
                          value={userBook.currentPage || 0}
                          onChange={(e) => updateProgress(userBook.id, e.target.value)}
                        />
                        <button 
                          className="page-btn page-increment"
                          onClick={() => {
                            const newPage = Math.min(userBook.Book.pageCount, (userBook.currentPage || 0) + 1);
                            updateProgress(userBook.id, newPage);
                          }}
                          disabled={(userBook.currentPage || 0) >= userBook.Book.pageCount}
                        >
                          +
                        </button>
                      </div>
                      <span>/ {userBook.Book.pageCount}</span>
                    </div>
                  </div>
                )}
                
                {userBook.status === 'finished' && (
                  <div className="rating-section">
                    <div className="rating-stars">
                      <label>Rating:</label>
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`star ${(userBook.rating || 0) >= star ? 'filled' : ''}`}
                            onClick={() => updateRatingAndNotes(userBook.id, star, userBook.notes)}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="notes-section">
                      <label htmlFor={`notes-${userBook.id}`}>Notes:</label>
                      <textarea
                        id={`notes-${userBook.id}`}
                        placeholder="Add your thoughts about this book..."
                        value={userBook.notes || ''}
                        onChange={(e) => setUserBooks(userBooks.map(book => 
                          book.id === userBook.id ? { ...book, notes: e.target.value } : book
                        ))}
                        onBlur={(e) => updateRatingAndNotes(userBook.id, userBook.rating, e.target.value)}
                        rows="3"
                      />
                    </div>
                  </div>
                )}
                
                <div className="book-actions">
                  <select 
                    value={userBook.status} 
                    onChange={(e) => updateStatus(userBook.id, e.target.value)}
                  >
                    <option value="reading">Reading</option>
                    <option value="finished">Finished</option>
                    <option value="dropped">Dropped</option>
                  </select>
                  <button onClick={() => removeBook(userBook.id)} className="btn-remove">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBooks;
