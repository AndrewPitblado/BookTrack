import { useState, useEffect } from 'react';
import api from '../services/api';
import './Achievements.css';

const Achievements = () => {
  const [achievementProgress, setAchievementProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

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
      platinum: '#e5e4e2',
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

      <div className="achievements-grid">
        {achievementProgress.map((achievement) => {
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

      {achievementProgress.length === 0 && (
        <p className="no-achievements">
          No achievements available yet. Check back later!
        </p>
      )}
    </div>
  );
};

export default Achievements;
