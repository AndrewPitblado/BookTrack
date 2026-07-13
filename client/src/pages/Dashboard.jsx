import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import { resolveAchievementIcon } from "../utils/achievementIcon";
import "./Dashboard.css";

const GOAL_TYPE_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const GOAL_METRIC_LABELS = {
  pages: "Pages",
  books: "Books",
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    reading: 0,
    finished: 0,
    achievements: 0,
    totalPoints: 0,
    currentStreak: 0,
    lastReadingDate: null,
  });
  const [recentBooks, setRecentBooks] = useState([]);
  const [friends, setFriends] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          booksResponse,
          achievementsResponse,
          friendsResponse,
          streakResponse,
          goalsResponse,
        ] = await Promise.all([
          api.get("/user-books"),
          api.get("/achievements/user"),
          api.get("/friends"),
          api.get("/users/me/streak"),
          api.get("/goals", {
            params: {
              activeOnly: true,
              tzOffsetMinutes: -new Date().getTimezoneOffset(),
            },
          }),
        ]);

        const userBooks = booksResponse.data.userBooks;
        const userAchievements = achievementsResponse.data.userAchievements;
        const friendsList = friendsResponse.data.friends || [];
        const activeGoals = goalsResponse.data.goals || [];

        // Calculate stats
        const reading = userBooks.filter((b) => b.status === "reading").length;
        const finished = userBooks.filter(
          (b) => b.status === "finished",
        ).length;
        const achievements = userAchievements.length;
        const totalPoints = userAchievements.reduce(
          (sum, ua) => sum + (ua.Achievement?.points || 0),
          0,
        );
        const currentStreak = streakResponse.data?.streak?.currentStreak || 0;
        const lastReadingDate =
          streakResponse.data?.streak?.lastReadingDate || null;

        setStats({
          reading,
          finished,
          achievements,
          totalPoints,
          currentStreak,
          lastReadingDate,
        });
        setRecentBooks(userBooks.slice(0, 5));
        setRecentAchievements(userAchievements.slice(0, 7));
        setFriends(friendsList);
        setGoals(activeGoals);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const readingBook = recentBooks.find((b) => b.status === "reading");
  const featuredFriend = friends.slice(0, 3); //Show first three friends if we have them, otherwise just one or none
  const friendCount = friends.length;
  const primaryGoal = goals.find((g) => g.isPrimary) || null;

  const formatLastReadLabel = (dateString) => {
    if (!dateString) {
      return "Last read: No logs yet";
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return "Last read: No logs yet";
    }

    const readDay = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
    );
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysAgo = Math.round((today - readDay) / msPerDay);

    if (daysAgo === 0) {
      return "Last read: Today";
    }

    if (daysAgo === 1) {
      return "Last read: Yesterday";
    }

    if (daysAgo > 1 && daysAgo <= 6) {
      return `Last read: ${daysAgo} days ago`;
    }

    return `Last read: ${parsed.toLocaleDateString()}`;
  };

  return (
    <div className="dashboard">
      <h1>Welcome back, {user?.username}! 📖</h1>

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
        <div className="stat-card stat-streak">
          <span className="stat-number">{stats.currentStreak}</span>
          <span className="stat-label">Day Streak</span>
          <span className="stat-subtext">
            {formatLastReadLabel(stats.lastReadingDate)}
          </span>
        </div>
      </div>

      {primaryGoal ? (
        <div className="dashboard-section goal-highlight">
          <div className="goal-highlight-header">
            <h2>
              🎯 {GOAL_TYPE_LABELS[primaryGoal.type]}{" "}
              {GOAL_METRIC_LABELS[primaryGoal.metric]} Goal
            </h2>
            <Link to="/goals" className="goal-highlight-link">
              View Goals
            </Link>
          </div>
          <div className="progress-bar-small goal-highlight-bar">
            <div
              className="progress-fill-small"
              style={{ width: `${primaryGoal.progress.percentComplete}%` }}
            />
          </div>
          <p className="goal-highlight-text">
            {primaryGoal.progress.currentValue} / {primaryGoal.progress.target}{" "}
            {GOAL_METRIC_LABELS[primaryGoal.metric].toLowerCase()} (
            {primaryGoal.progress.percentComplete}%)
            {primaryGoal.progress.isComplete && " · Complete! 🎉"}
          </p>
        </div>
      ) : (
        <div className="dashboard-section goal-highlight goal-highlight-empty">
          <h2>🎯 Reading Goal</h2>
          <p>
            You haven&apos;t set or pinned a reading goal yet.{" "}
            Head to the <Link to="/goals">goals page</Link> to set one.
          </p>
        </div>
      )}

      {/* Contextual Quick Actions */}
      <div className="quick-actions">
        {recentBooks.length === 0 ? (
          <Link to="/search" className="action-btn primary">
            <span className="action-btn-label">
              <span aria-hidden="true">📚</span>
              <span>Add Your First Book</span>
            </span>
          </Link>
        ) : (
          <>
            {stats.reading > 0 && readingBook && (
              <Link to="/my-books" className="action-btn reading">
                <span className="action-btn-label">
                  <span aria-hidden="true">📖</span>
                  <span>
                    Continue Reading: {readingBook?.Book?.title || "Your Book"}
                  </span>
                </span>
              </Link>
            )}
            <Link to="/search" className="action-btn">
              <span className="action-btn-label">
                <span aria-hidden="true">🔍</span>
                <span>Discover More Books</span>
              </span>
            </Link>
            <Link to="/achievements" className="action-btn achievements">
              <span className="action-btn-label">
                <span aria-hidden="true">🎯</span>
                <span>View All Achievements</span>
              </span>
            </Link>

            {friendCount === 0 && (
              <Link to="/friends" className="action-btn">
                <span className="action-btn-label">
                  <span aria-hidden="true">👥</span>
                  <span>Find Friends</span>
                </span>
              </Link>
            )}

            {friendCount === 1 && featuredFriend[0] && (
              <Link
                to={`/friends/${featuredFriend[0].id}`}
                className="action-btn"
              >
                <span className="action-btn-label">
                  <span aria-hidden="true">👤</span>
                  <span>View {featuredFriend[0].username}'s Profile</span>
                </span>
              </Link>
            )}

            {friendCount > 1 && (
              <>
                {/* If there are multiple featured friends show the top 3 */}
                {featuredFriend[0] && (
                  <Link
                    to={`/friends/${featuredFriend[0].id}`}
                    className="action-btn"
                  >
                    <span className="action-btn-label">
                      <span aria-hidden="true">👤</span>
                      <span>Visit {featuredFriend[0].username}'s Profile</span>
                    </span>
                  </Link>
                )}
                {featuredFriend[1] && (
                  <Link
                    to={`/friends/${featuredFriend[1].id}`}
                    className="action-btn"
                  >
                    <span className="action-btn-label">
                      <span aria-hidden="true">👤</span>
                      <span>Visit {featuredFriend[1].username}'s Profile</span>
                    </span>
                  </Link>
                )}
                {featuredFriend[2] && (
                  <Link
                    to={`/friends/${featuredFriend[2].id}`}
                    className="action-btn"
                  >
                    <span className="action-btn-label">
                      <span aria-hidden="true">👤</span>
                      <span>Visit {featuredFriend[2].username}'s Profile</span>
                    </span>
                  </Link>
                )}
              </>
            )}
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
                      {userBook.Book?.authors?.map((a) => a.name).join(", ") ||
                        "Unknown Author"}
                    </span>
                    {userBook.status === "reading" &&
                      userBook.Book?.pageCount && (
                        <div className="book-progress">
                          <div className="progress-bar-small">
                            <div
                              className="progress-fill-small"
                              style={{
                                width: `${Math.min(((userBook.currentPage || 0) / userBook.Book.pageCount) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="progress-label">
                            {Math.round(
                              ((userBook.currentPage || 0) /
                                userBook.Book.pageCount) *
                                100,
                            )}
                            %
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
            <p>
              No books yet. <Link to="/search">Search for books</Link> to get
              started!
            </p>
          )}
        </div>

        {recentAchievements.length > 0 && (
          <div className="dashboard-section">
            <h2>🏆 Recent Achievements</h2>
            <div className="recent-achievements">
              {recentAchievements.map((ua) => (
                <div key={ua.id} className="achievement-item">
                  <div
                    className={`achievement-badge tier-${ua.Achievement?.tier}`}
                  >
                    {ua.Achievement?.icon ? (
                      <img
                        src={resolveAchievementIcon(ua.Achievement.icon)}
                        alt={ua.Achievement.name}
                        className="achievement-icon-small"
                      />
                    ) : (
                      <span className="achievement-emoji">🏆</span>
                    )}
                  </div>
                  <div className="achievement-info">
                    <span className="achievement-name">
                      {ua.Achievement?.name}
                    </span>
                    <span className="achievement-points">
                      {ua.Achievement?.points} pts
                    </span>
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
