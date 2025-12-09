import { useState, useEffect } from 'react';
import api from '../services/api';
import './Achievements.css';

const Achievements = () => {
  const [achievementProgress, setAchievementProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [sortBy, setSortBy] = useState('tier'); // 'tier', 'name', 'points', 'progress'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unlocked', 'locked'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await api.get('/achievements/progress');
      setAchievementProgress(response.data.progress);
      
      // Calculate total points
      const points = response.data.progress
        .filter(a => a.unlocked)
        .reduce((sum, a) => sum + (a.points || 0), 0);
      setTotalPoints(points);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAchievements = async () => {
    setChecking(true);
    try {
      const response = await api.post('/achievements/check');
      if (response.data.newlyUnlocked.length > 0) {
        fetchAchievements(); // Refresh list
        alert(response.data.message);
      } else {
        alert('No new achievements unlocked yet. Keep reading!');
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    } finally {
      setChecking(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#87ceeb',
    };
    return colors[tier] || '#999';
  };

  const getTierEmoji = (tier) => {
    const emojis = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
    };
    return emojis[tier] || '🏅';
  };

  const unlockedCount = achievementProgress.filter(a => a.unlocked).length;

  // Filter achievements
  const filteredAchievements = achievementProgress.filter(achievement => {
    if (filterStatus === 'unlocked') return achievement.unlocked;
    if (filterStatus === 'locked') return !achievement.unlocked;
    return true;
  });

  // Sort achievements
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'points':
        return b.points - a.points;
      case 'progress':
        return b.progress.percentage - a.progress.percentage;
      case 'tier':
      default:
        const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
        return tierOrder[a.tier] - tierOrder[b.tier];
    }
  });

  // Paginate achievements
  const totalPages = Math.ceil(sortedAchievements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAchievements = sortedAchievements.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, filterStatus]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="achievements">
      <div className="achievements-header">
        <div>
          <h1>Achievements</h1>
          <p className="achievements-summary">
            Unlocked: {unlockedCount} / {achievementProgress.length} | Total Points: {totalPoints}
          </p>
        </div>
        <button onClick={checkAchievements} disabled={checking}>
          {checking ? 'Checking...' : '🔄 Check for New Achievements'}
        </button>
      </div>

      <div className="achievements-controls">
        <div className="filter-tabs">
          <button 
            className={filterStatus === 'all' ? 'active' : ''} 
            onClick={() => setFilterStatus('all')}
          >
            All ({achievementProgress.length})
          </button>
          <button 
            className={filterStatus === 'unlocked' ? 'active' : ''} 
            onClick={() => setFilterStatus('unlocked')}
          >
            Unlocked ({unlockedCount})
          </button>
          <button 
            className={filterStatus === 'locked' ? 'active' : ''} 
            onClick={() => setFilterStatus('locked')}
          >
            Locked ({achievementProgress.length - unlockedCount})
          </button>
        </div>

        <div className="sort-dropdown">
          <label htmlFor="sort-select">Sort by:</label>
          <select 
            id="sort-select"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="tier">Tier</option>
            <option value="name">Name</option>
            <option value="points">Points</option>
            <option value="progress">Progress</option>
          </select>
        </div>
      </div>

      <div className="achievements-grid">
        {paginatedAchievements.map((achievement) => {
          const isUnlocked = achievement.unlocked;
          const showDetails = !achievement.isSecret || isUnlocked;

          return (
            <div 
              key={achievement.achievementId} 
              className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'} tier-${achievement.tier}`}
            >
              <div className="achievement-header">
                <span className="achievement-tier">{getTierEmoji(achievement.tier)}</span>
                <span className="achievement-points">{achievement.points} pts</span>
              </div>
              
              <div className="achievement-medal">
                <div className={`medal-background tier-${achievement.tier} ${isUnlocked ? 'unlocked' : 'locked'}`}>
                  <div className="medal-inner">
                    {isUnlocked ? (
                      achievement.icon ? (
                        <img src={achievement.icon} alt={achievement.name} className="achievement-svg" />
                      ) : (
                        <span className="achievement-icon">🏆</span>
                      )
                    ) : (
                      <span className="achievement-icon locked-icon">🔒</span>
                    )}
                  </div>
                </div>
              </div>
              
              <h3>{showDetails ? achievement.name : '???'}</h3>
              <p>{showDetails ? achievement.description : 'Secret Achievement'}</p>
              
              {!isUnlocked && showDetails && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${achievement.progress.percentage}%`,
                        backgroundColor: getTierColor(achievement.tier)
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {achievement.progress.current} / {achievement.progress.target}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedAchievements.length === 0 && (
        <p className="no-achievements">
          {achievementProgress.length === 0 
            ? 'No achievements available yet. Check back later!'
            : 'No achievements match the current filter.'}
        </p>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Achievements;
