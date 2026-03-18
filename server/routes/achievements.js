const express = require('express');
const { Achievement, UserAchievement } = require('../models');
const { getAchievementProgress, reconcileUserAchievements } = require('../services/achievementEngine');
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

// GET /api/achievements/progress - Get progress for all achievements
router.get('/progress', auth, async (req, res) => {
  try {
    const progress = await getAchievementProgress(req.userId);

    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/achievements/check - Check and award any new achievements
router.post('/check', auth, async (req, res) => {
  try {
    const { newlyUnlocked, newlyRevoked, unlockedCount, revokedCount } = await reconcileUserAchievements(req.userId);

    let message = 'No achievement changes';
    if (unlockedCount > 0 && revokedCount > 0) {
      message = `Unlocked ${unlockedCount} and revoked ${revokedCount} achievement(s).`;
    } else if (unlockedCount > 0) {
      message = `Unlocked ${unlockedCount} new achievement(s)!`;
    } else if (revokedCount > 0) {
      message = `Revoked ${revokedCount} achievement(s) no longer meeting requirements.`;
    }

    res.json({ 
      newlyUnlocked,
      newlyRevoked,
      message,
    });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
