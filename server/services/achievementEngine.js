const { Achievement, UserAchievement, ReadHistory, Book, sequelize } = require('../models');

function evaluateAchievement(achievement, stats) {
  const criteria = achievement.criteria || {};
  let current = 0;
  let target = 0;
  let earned = false;

  switch (criteria.type) {
    case 'books_finished':
      current = stats.booksFinished;
      target = criteria.count || 0;
      earned = current >= target;
      break;
    case 'author_books': {
      const maxAuthorCount = Math.max(...Object.values(stats.authorCounts), 0);
      current = maxAuthorCount;
      target = criteria.count || 0;
      earned = current >= target;
      break;
    }
    case 'genre_diversity':
      current = stats.uniqueGenres.size;
      target = criteria.uniqueGenres || 0;
      earned = current >= target;
      break;
    case 'genre_master':
      current = stats.genreCounts[criteria.genre] || 0;
      target = criteria.count || 0;
      earned = current >= target;
      break;
    case 'page_count':
      current = Number(stats.totalPages || 0);
      target = criteria.totalPages || 0;
      earned = current >= target;
      break;
    case 'speed_reading':
      current = stats.readBooks.filter((record) => {
        if (record.startDate && record.endDate) {
          const start = new Date(record.startDate);
          const end = new Date(record.endDate);
          const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          return daysDiff <= (criteria.days || 999);
        }
        return false;
      }).length;
      target = 1;
      earned = current >= 1;
      break;
    default:
      current = 0;
      target = 1;
      earned = false;
      break;
  }

  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return {
    earned,
    progress: {
      current,
      target,
      percentage: Math.round(percentage),
    },
  };
}

async function getUserStats(userId, transaction) {
  const booksFinished = await ReadHistory.count({ where: { userId }, transaction });

  const readBooks = await ReadHistory.findAll({
    where: { userId },
    include: [{ model: Book, attributes: ['genres'] }],
    attributes: ['bookId', 'startDate', 'endDate'],
    transaction,
  });

  const uniqueGenres = new Set();
  const genreCounts = {};

  readBooks.forEach((record) => {
    const genres = record.Book?.genres || [];
    genres.forEach((genre) => {
      uniqueGenres.add(genre);
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  const authorBooks = await sequelize.query(
    `
      SELECT a.id, COUNT(DISTINCT rh.bookId) as count
      FROM read_history rh
      JOIN book_authors ba ON rh.bookId = ba.bookId
      JOIN authors a ON ba.authorId = a.id
      WHERE rh.userId = :userId
      GROUP BY a.id
    `,
    {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  const authorCounts = {};
  authorBooks.forEach((row) => {
    authorCounts[row.id] = parseInt(row.count, 10);
  });

  const totalPagesResult = await sequelize.query(
    `
      SELECT SUM(b.pageCount) as totalPages
      FROM read_history rh
      JOIN books b ON rh.bookId = b.id
      WHERE rh.userId = :userId AND b.pageCount IS NOT NULL
    `,
    {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  const totalPages = Number(totalPagesResult[0]?.totalPages || 0);

  return {
    booksFinished,
    readBooks,
    uniqueGenres,
    genreCounts,
    authorCounts,
    totalPages,
  };
}

async function getEarnedAchievements(userId, transaction) {
  const [stats, achievements] = await Promise.all([
    getUserStats(userId, transaction),
    Achievement.findAll({ transaction }),
  ]);

  const evaluated = achievements.map((achievement) => {
    const evaluation = evaluateAchievement(achievement, stats);
    return {
      achievement,
      earned: evaluation.earned,
      progress: evaluation.progress,
    };
  });

  const earnedAchievementIds = new Set(
    evaluated.filter((entry) => entry.earned).map((entry) => entry.achievement.id)
  );

  return { stats, achievements, evaluated, earnedAchievementIds };
}

async function getAchievementProgress(userId) {
  const { achievements, evaluated } = await getEarnedAchievements(userId);

  const unlockedAchievements = await UserAchievement.findAll({
    where: { userId },
    attributes: ['achievementId'],
  });

  const unlockedIds = new Set(unlockedAchievements.map((ua) => ua.achievementId));
  const progressById = new Map(evaluated.map((entry) => [entry.achievement.id, entry.progress]));

  return achievements.map((achievement) => ({
    achievementId: achievement.id,
    name: achievement.name,
    description: achievement.description,
    tier: achievement.tier,
    icon: achievement.icon,
    isSecret: achievement.isSecret,
    points: achievement.points,
    unlocked: unlockedIds.has(achievement.id),
    progress: progressById.get(achievement.id),
  }));
}

async function getReconciliationPlan(userId, transaction) {
  const { achievements, earnedAchievementIds } = await getEarnedAchievements(userId, transaction);

  const existingRows = await UserAchievement.findAll({
    where: { userId },
    transaction,
  });

  const existingIds = new Set(existingRows.map((row) => row.achievementId));

  const newlyEarned = achievements.filter(
    (achievement) => earnedAchievementIds.has(achievement.id) && !existingIds.has(achievement.id)
  );

  const newlyRevokedRows = existingRows.filter(
    (row) => !earnedAchievementIds.has(row.achievementId)
  );

  const achievementById = new Map(achievements.map((achievement) => [achievement.id, achievement]));

  return {
    newlyEarned,
    newlyRevokedRows,
    achievementById,
  };
}

async function reconcileUserAchievements(userId, transactionOrOptions, maybeOptions) {
  const transaction =
    transactionOrOptions && typeof transactionOrOptions.commit === 'function'
      ? transactionOrOptions
      : undefined;
  const options =
    transaction && maybeOptions
      ? maybeOptions
      : transactionOrOptions && !transaction
      ? transactionOrOptions
      : {};

  const dryRun = Boolean(options?.dryRun);

  const { newlyEarned, newlyRevokedRows, achievementById } = await getReconciliationPlan(userId, transaction);

  if (!dryRun && newlyEarned.length > 0) {
    await UserAchievement.bulkCreate(
      newlyEarned.map((achievement) => ({
        userId,
        achievementId: achievement.id,
      })),
      { transaction }
    );
  }

  if (!dryRun && newlyRevokedRows.length > 0) {
    await UserAchievement.destroy({
      where: {
        id: newlyRevokedRows.map((row) => row.id),
      },
      transaction,
    });
  }

  const newlyUnlocked = newlyEarned.map((achievement) => ({
    achievementId: achievement.id,
    Achievement: achievement,
  }));

  const newlyRevoked = newlyRevokedRows.map((row) => ({
    achievementId: row.achievementId,
    Achievement: achievementById.get(row.achievementId),
  }));

  return {
    newlyUnlocked,
    newlyRevoked,
    unlockedCount: newlyUnlocked.length,
    revokedCount: newlyRevoked.length,
  };
}

module.exports = {
  getAchievementProgress,
  getReconciliationPlan,
  reconcileUserAchievements,
};
