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
  });
  const [recentBooks, setRecentBooks] = useState([]);
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
        const achievements = achievementsResponse.data.userAchievements.length;

        setStats({ reading, finished, achievements });
        setRecentBooks(userBooks.slice(0, 5));
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
        <div className="stat-card">
          <span className="stat-number">{stats.reading}</span>
          <span className="stat-label">Currently Reading</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.finished}</span>
          <span className="stat-label">Books Finished</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.achievements}</span>
          <span className="stat-label">Achievements</span>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Recent Books</h2>
        {recentBooks.length > 0 ? (
          <div className="recent-books">
            {recentBooks.map((userBook) => (
              <div key={userBook.id} className="book-item">
                <span className="book-title">{userBook.Book?.title}</span>
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

      <div className="quick-actions">
        <Link to="/search" className="action-btn">🔍 Find Books</Link>
        <Link to="/my-books" className="action-btn">📖 My Library</Link>
        <Link to="/achievements" className="action-btn">🏆 Achievements</Link>
      </div>
    </div>
  );
};

export default Dashboard;
