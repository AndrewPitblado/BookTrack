import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import './FriendProfile.css';

const FriendProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFriendData();
  }, [userId]);

  const fetchFriendData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all data in parallel
      const [statsRes, booksRes, achievementsRes] = await Promise.all([
        api.get(`/friends/${userId}/stats`),
        api.get(`/friends/${userId}/books`),
        api.get(`/friends/${userId}/achievements`)
      ]);

      setProfile(statsRes.data.user);
      setStats(statsRes.data.stats);
      setBooks(booksRes.data.userBooks);
      setAchievements(achievementsRes.data.userAchievements);
    } catch (err) {
      console.error('Error fetching friend data:', err);
      setError(err.response?.data?.message || 'Error loading friend profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading friend profile...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <Link to="/friends" className="btn-back">← Back to Friends</Link>
      </div>
    );
  }

  return (
    <div className="friend-profile">
      <Link to="/friends" className="back-link">← Back to Friends</Link>

      <div className="profile-header">
        <h1>{profile?.username}'s Profile</h1>
        <p className="member-since">Member since {new Date(profile?.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-reading">
          <span className="stat-number">{stats?.reading || 0}</span>
          <span className="stat-label">Currently Reading</span>
        </div>
        <div className="stat-card stat-finished">
          <span className="stat-number">{stats?.finished || 0}</span>
          <span className="stat-label">Books Finished</span>
        </div>
        <div className="stat-card stat-achievements">
          <span className="stat-number">{stats?.achievements || 0}</span>
          <span className="stat-label">Achievements</span>
        </div>
        <div className="stat-card stat-points">
          <span className="stat-number">{stats?.totalPoints || 0}</span>
          <span className="stat-label">Total Points</span>
        </div>
      </div>

      <div className="profile-sections">
        <div className="profile-section">
          <h2>📚 Recent Books ({books.length})</h2>
          {books.length === 0 ? (
            <p className="no-data">No books yet</p>
          ) : (
            <div className="books-list">
              {books.slice(0, 10).map((userBook) => (
                <div key={userBook.id} className="book-item">
                  {userBook.Book?.thumbnail && (
                    <img 
                      src={userBook.Book.thumbnail} 
                      alt={userBook.Book.title}
                      className="book-thumbnail"
                    />
                  )}
                  <div className="book-details">
                    <span className="book-title">{userBook.Book?.title}</span>
                    <span className="book-author">
                      {userBook.Book?.authors?.map(a => a.name).join(', ') || 'Unknown Author'}
                    </span>
                    {userBook.status === 'finished' && userBook.rating && (
                      <div className="book-rating">
                        <span className="rating-label">Rating:</span>
                        <div className="rating-stars-display">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`star-display ${userBook.rating >= star ? 'filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {userBook.status === 'finished' && userBook.notes && (
                      <div className="book-notes">
                        <span className="notes-label">Notes:</span>
                        <p className="notes-text">{userBook.notes}</p>
                      </div>
                    )}
                    {userBook.status === 'reading' && userBook.Book?.pageCount && userBook.currentPage && (
                      <div className="book-progress">
                        <div className="progress-bar-small">
                          <div 
                            className="progress-fill-small"
                            style={{ width: `${Math.min((userBook.currentPage || 0) / userBook.Book.pageCount * 100, 100)}%` }}
                          />
                        </div>
                        <span className="progress-label">
                          {Math.round((userBook.currentPage || 0) / userBook.Book.pageCount * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`book-status status-${userBook.status}`}>
                    {userBook.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-section">
          <h2>🏆 Achievements ({achievements.length})</h2>
          {achievements.length === 0 ? (
            <p className="no-data">No achievements yet</p>
          ) : (
            <div className="achievements-list">
              {achievements.slice(0, 10).map((ua) => (
                <div key={ua.id} className="achievement-item">
                  <div className={`achievement-badge tier-${ua.Achievement?.tier}`}>
                    {ua.Achievement?.icon ? (
                      <img src={ua.Achievement.icon} alt={ua.Achievement.name} className="achievement-icon-img" />
                    ) : (
                      <span className="achievement-emoji">🏆</span>
                    )}
                  </div>
                  <div className="achievement-info">
                    <span className="achievement-name">{ua.Achievement?.name}</span>
                    <span className="achievement-description">{ua.Achievement?.description}</span>
                    <span className="achievement-points">{ua.Achievement?.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendProfile;
