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
