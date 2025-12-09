import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    reading: 0,
    finished: 0,
    achievements: 0,
    totalPoints: 0,
  });
  const [recentBooks, setRecentBooks] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch user books
        const booksResponse = await api.get('/user-books');
        const userBooks = booksResponse.data.userBooks;

        // Calculate stats
        const reading = userBooks.filter((b) => b.status === 'reading').length;
        const finished = userBooks.filter((b) => b.status === 'finished').length;

        // Fetch achievements
        const achievementsResponse = await api.get('/achievements/user');
        const userAchievements = achievementsResponse.data.userAchievements;
        const achievements = userAchievements.length;
        const totalPoints = userAchievements.reduce((sum, ua) => sum + (ua.Achievement?.points || 0), 0);

        setStats({ reading, finished, achievements, totalPoints });
        setRecentBooks(userBooks.slice(0, 5));
        setRecentAchievements(userAchievements.slice(0, 7));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Welcome back, {user?.username}! 👋</h1>

      <div className="stats-grid">
        <div className="stat-card stat-reading">
          <span className="stat-number">{stats.reading}</span>
          <span className="stat-label">Currently Reading</span>
        </div>
        <div className="stat-card stat-finished">
          <span className="stat-number">{stats.finished}</span>
          <span className="stat-label">Books Finished</span>
        </div>
        <div className="stat-card stat-achievements">
          <span className="stat-number">{stats.achievements}</span>
          <span className="stat-label">Achievements</span>
        </div>
        <div className="stat-card stat-points">
          <span className="stat-number">{stats.totalPoints}</span>
          <span className="stat-label">Total Points</span>
        </div>
      </div>
      {/* Contextual Quick Actions */}
      <div className="quick-actions">
        {recentBooks.length === 0 ? (
          <Link to="/search" className="action-btn primary">
            📚 Add Your First Book
          </Link>
        ) : (
          <>
            {stats.reading > 0 && recentBooks.find(b => b.status === 'reading') && (
              <Link 
                to="/my-books" 
                className="action-btn reading"
              >
                📖 Continue Reading: {recentBooks.find(b => b.status === 'reading')?.Book?.title || 'Your Book'}
              </Link>
            )}
            <Link to="/search" className="action-btn">
              🔍 Discover More Books
            </Link>
            <Link to="/achievements" className="action-btn achievements">
              🎯 View All Achievements
            </Link>
          </>
        )}
      </div>

      <div className="recent-sections">
        <div className="dashboard-section">
          <h2>📚 Recent Books</h2>
          {recentBooks.length > 0 ? (
            <div className="recent-books">
              {recentBooks.map((userBook) => (
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
                    {userBook.status === 'reading' && userBook.Book?.pageCount && (
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
          ) : (
            <p>No books yet. <Link to="/search">Search for books</Link> to get started!</p>
          )}
        </div>

        {recentAchievements.length > 0 && (
          <div className="dashboard-section">
            <h2>🏆 Recent Achievements</h2>
            <div className="recent-achievements">
              {recentAchievements.map((ua) => (
                <div key={ua.id} className="achievement-item">
                  <div className={`achievement-badge tier-${ua.Achievement?.tier}`}>
                    {ua.Achievement?.icon ? (
                      <img src={ua.Achievement.icon} alt={ua.Achievement.name} className="achievement-icon-small" />
                    ) : (
                      <span className="achievement-emoji">🏆</span>
                    )}
                  </div>
                  <div className="achievement-info">
                    <span className="achievement-name">{ua.Achievement?.name}</span>
                    <span className="achievement-points">{ua.Achievement?.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      
    </div>
  );
};

export default Dashboard;
