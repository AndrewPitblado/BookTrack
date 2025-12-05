import { useState, useEffect } from 'react';
import api from '../services/api';
import './Achievements.css';

const Achievements = () => {
  const [allAchievements, setAllAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const [allResponse, userResponse] = await Promise.all([
        api.get('/achievements'),
        api.get('/achievements/user'),
      ]);

      setAllAchievements(allResponse.data.achievements);
      setUserAchievements(userResponse.data.userAchievements);
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

  const unlockedIds = userAchievements.map((ua) => ua.achievementId);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="achievements">
      <div className="achievements-header">
        <h1>Achievements</h1>
        <button onClick={checkAchievements} disabled={checking}>
          {checking ? 'Checking...' : '🔄 Check for New Achievements'}
        </button>
      </div>

      <p className="achievements-summary">
        Unlocked: {userAchievements.length} / {allAchievements.length}
      </p>

      <div className="achievements-grid">
        {allAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          const userAchievement = userAchievements.find(
            (ua) => ua.achievementId === achievement.id
          );

          return (
            <div 
              key={achievement.id} 
              className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="achievement-icon">
                {isUnlocked ? (achievement.icon || '🏆') : '🔒'}
              </span>
              <h3>{achievement.name}</h3>
              <p>{achievement.description}</p>
              {isUnlocked && userAchievement && (
                <span className="unlock-date">
                  Unlocked: {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {allAchievements.length === 0 && (
        <p className="no-achievements">
          No achievements available yet. Check back later!
        </p>
      )}
    </div>
  );
};

export default Achievements;
