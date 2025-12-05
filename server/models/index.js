const sequelize = require('../config/database');
const User = require('./User');
const Book = require('./Book');
const UserBook = require('./UserBook');
const ReadHistory = require('./ReadHistory');
const Achievement = require('./Achievement');
const UserAchievement = require('./UserAchievement');

// Define associations

// User <-> UserBook <-> Book
User.hasMany(UserBook, { foreignKey: 'userId', as: 'userBooks' });
UserBook.belongsTo(User, { foreignKey: 'userId' });

Book.hasMany(UserBook, { foreignKey: 'bookId', as: 'userBooks' });
UserBook.belongsTo(Book, { foreignKey: 'bookId' });

// User <-> ReadHistory <-> Book
User.hasMany(ReadHistory, { foreignKey: 'userId', as: 'readHistory' });
ReadHistory.belongsTo(User, { foreignKey: 'userId' });

Book.hasMany(ReadHistory, { foreignKey: 'bookId', as: 'readHistory' });
ReadHistory.belongsTo(Book, { foreignKey: 'bookId' });

// User <-> UserAchievement <-> Achievement
User.hasMany(UserAchievement, { foreignKey: 'userId', as: 'userAchievements' });
UserAchievement.belongsTo(User, { foreignKey: 'userId' });

Achievement.hasMany(UserAchievement, { foreignKey: 'achievementId', as: 'userAchievements' });
UserAchievement.belongsTo(Achievement, { foreignKey: 'achievementId' });

module.exports = {
  sequelize,
  User,
  Book,
  UserBook,
  ReadHistory,
  Achievement,
  UserAchievement,
};
