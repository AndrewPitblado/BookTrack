const express = require('express');
const { Achievement, UserAchievement, ReadHistory, Book, Author, sequelize } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

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
    const userId = req.userId;
    
    // Calculate user stats
    const booksFinished = await ReadHistory.count({ where: { userId } });
    
    // Get unique genres
    const readBooks = await ReadHistory.findAll({
      where: { userId },
      include: [{ model: Book, attributes: ['genres'] }],
      attributes: ['bookId', 'startDate', 'endDate'],
    });
    
    const uniqueGenres = new Set();
    readBooks.forEach(record => {
      if (record.Book?.genres) {
        record.Book.genres.forEach(genre => uniqueGenres.add(genre));
      }
    });
    
    // Get books per author
    const authorBooks = await sequelize.query(`
      SELECT a.id, a.name, COUNT(DISTINCT rh.bookId) as count
      FROM read_history rh
      JOIN book_authors ba ON rh.bookId = ba.bookId
      JOIN authors a ON ba.authorId = a.id
      WHERE rh.userId = :userId
      GROUP BY a.id, a.name
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    });
    
    const authorCounts = {};
    authorBooks.forEach(row => {
      authorCounts[row.id] = parseInt(row.count);
    });
    
    // Calculate total pages
    const totalPagesResult = await sequelize.query(`
      SELECT SUM(b.pageCount) as totalPages
      FROM read_history rh
      JOIN books b ON rh.bookId = b.id
      WHERE rh.userId = :userId AND b.pageCount IS NOT NULL
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    });
    
    const totalPages = totalPagesResult[0]?.totalPages || 0;
    
    // Get all achievements
    const achievements = await Achievement.findAll();
    
    // Get unlocked achievement IDs
    const unlockedAchievements = await UserAchievement.findAll({
      where: { userId },
      attributes: ['achievementId'],
    });
    const unlockedIds = unlockedAchievements.map(ua => ua.achievementId);
    
    // Calculate progress for each achievement
    const progress = achievements.map(achievement => {
      const criteria = achievement.criteria || {};
      let current = 0;
      let target = 0;
      let percentage = 0;
      
      switch (criteria.type) {
        case 'books_finished':
          current = booksFinished;
          target = criteria.count || 0;
          break;
        case 'author_books':
          current = authorCounts[criteria.authorId] || 0;
          target = criteria.count || 0;
          break;
        case 'genre_diversity':
          current = uniqueGenres.size;
          target = criteria.uniqueGenres || 0;
          break;
        case 'genre_master':
          const genreCount = readBooks.filter(record => 
            record.Book?.genres?.includes(criteria.genre)
          ).length;
          current = genreCount;
          target = criteria.count || 0;
          break;
        case 'page_count':
          current = totalPages;
          target = criteria.totalPages || 0;
          break;
        case 'speed_reading':
          // Check if user has finished any book within the target days
          const speedReads = readBooks.filter(record => {
            const history = record; // Already have ReadHistory records
            if (history.startDate && history.endDate) {
              const start = new Date(history.startDate);
              const end = new Date(history.endDate);
              const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
              return daysDiff <= (criteria.days || 999);
            }
            return false;
          }).length;
          current = speedReads;
          target = 1; // At least one speed read
          break;
        default:
          current = 0;
          target = 1;
      }
      
      percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      
      return {
        achievementId: achievement.id,
        name: achievement.name,
        description: achievement.description,
        tier: achievement.tier,
        icon: achievement.icon,
        isSecret: achievement.isSecret,
        points: achievement.points,
        unlocked: unlockedIds.includes(achievement.id),
        progress: {
          current,
          target,
          percentage: Math.round(percentage),
        },
      };
    });
    
    res.json({ progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/achievements/check - Check and award any new achievements
router.post('/check', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const newlyUnlocked = [];
    
    // Calculate user stats (same as progress endpoint)
    const booksFinished = await ReadHistory.count({ where: { userId } });
    
    const readBooks = await ReadHistory.findAll({
      where: { userId },
      include: [{ model: Book, attributes: ['genres'] }],
      attributes: ['bookId', 'startDate', 'endDate'],
    });
    
    const uniqueGenres = new Set();
    readBooks.forEach(record => {
      if (record.Book?.genres) {
        record.Book.genres.forEach(genre => uniqueGenres.add(genre));
      }
    });
    
    const authorBooks = await sequelize.query(`
      SELECT a.id, COUNT(DISTINCT rh.bookId) as count
      FROM read_history rh
      JOIN book_authors ba ON rh.bookId = ba.bookId
      JOIN authors a ON ba.authorId = a.id
      WHERE rh.userId = :userId
      GROUP BY a.id
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    });
    
    const authorCounts = {};
    authorBooks.forEach(row => {
      authorCounts[row.id] = parseInt(row.count);
    });
    
    const totalPagesResult = await sequelize.query(`
      SELECT SUM(b.pageCount) as totalPages
      FROM read_history rh
      JOIN books b ON rh.bookId = b.id
      WHERE rh.userId = :userId AND b.pageCount IS NOT NULL
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    });
    
    const totalPages = totalPagesResult[0]?.totalPages || 0;

    // Get all achievements
    const achievements = await Achievement.findAll();

    // Get user's existing achievements
    const existingAchievements = await UserAchievement.findAll({
      where: { userId },
    });
    const existingIds = existingAchievements.map((ua) => ua.achievementId);

    // Check each achievement
    for (const achievement of achievements) {
      if (existingIds.includes(achievement.id)) continue;

      let earned = false;
      const criteria = achievement.criteria || {};

      switch (criteria.type) {
        case 'books_finished':
          earned = booksFinished >= (criteria.count || 0);
          break;
        case 'author_books':
          earned = (authorCounts[criteria.authorId] || 0) >= (criteria.count || 0);
          break;
        case 'genre_diversity':
          earned = uniqueGenres.size >= (criteria.uniqueGenres || 0);
          break;
        case 'genre_master':
          const genreCount = readBooks.filter(record => 
            record.Book?.genres?.includes(criteria.genre)
          ).length;
          earned = genreCount >= (criteria.count || 0);
          break;
        case 'page_count':
          earned = totalPages >= (criteria.totalPages || 0);
          break;
        case 'speed_reading':
          // Check if user has finished any book within the target days
          earned = readBooks.some(record => {
            if (record.startDate && record.endDate) {
              const start = new Date(record.startDate);
              const end = new Date(record.endDate);
              const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
              return daysDiff <= (criteria.days || 999);
            }
            return false;
          });
          break;
      }

      if (earned) {
        const userAchievement = await UserAchievement.create({
          userId,
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
