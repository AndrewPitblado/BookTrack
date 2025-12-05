const express = require('express');
const { Achievement, UserAchievement, ReadHistory } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/achievements - Get all achievements
router.get('/', auth, async (req, res) => {
  try {
    const achievements = await Achievement.findAll();
    res.json({ achievements });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/achievements/user - Get user's unlocked achievements
router.get('/user', auth, async (req, res) => {
  try {
    const userAchievements = await UserAchievement.findAll({
      where: { userId: req.userId },
      include: [{ model: Achievement }],
      order: [['unlockedAt', 'DESC']],
    });

    res.json({ userAchievements });
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/achievements/check - Check and award any new achievements
router.post('/check', auth, async (req, res) => {
  try {
    const newlyUnlocked = [];
    
    // Get user's read count
    const readCount = await ReadHistory.count({
      where: { userId: req.userId },
    });

    // Get all achievements
    const achievements = await Achievement.findAll();

    // Get user's existing achievements
    const existingAchievements = await UserAchievement.findAll({
      where: { userId: req.userId },
    });
    const existingIds = existingAchievements.map((ua) => ua.achievementId);

    // Check each achievement
    for (const achievement of achievements) {
      if (existingIds.includes(achievement.id)) continue;

      let earned = false;

      if (achievement.criteria?.type === 'books_finished') {
        earned = readCount >= achievement.criteria.count;
      }

      // Add more achievement type checks here as needed

      if (earned) {
        const userAchievement = await UserAchievement.create({
          userId: req.userId,
          achievementId: achievement.id,
        });
        newlyUnlocked.push({ ...userAchievement.toJSON(), Achievement: achievement });
      }
    }

    res.json({ 
      newlyUnlocked,
      message: newlyUnlocked.length > 0 
        ? `Unlocked ${newlyUnlocked.length} new achievement(s)!` 
        : 'No new achievements' 
    });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
