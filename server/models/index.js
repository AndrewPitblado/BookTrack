const sequelize = require('../config/database');
const User = require('./User');
const Book = require('./Book');
const Author = require('./Author');
const BookAuthor = require('./BookAuthor');
const UserBook = require('./UserBook');
const ReadHistory = require('./ReadHistory');
const Achievement = require('./Achievement');
const UserAchievement = require('./UserAchievement');
const Friendship = require('./Friendship');

// Define associations

// User <-> UserBook <-> Book
User.hasMany(UserBook, { foreignKey: 'userId', as: 'userBooks' });
UserBook.belongsTo(User, { foreignKey: 'userId' });

Book.hasMany(UserBook, { foreignKey: 'bookId', as: 'userBooks' });
UserBook.belongsTo(Book, { foreignKey: 'bookId' });

// Book <-> BookAuthor <-> Author (many-to-many)
Book.belongsToMany(Author, { 
  through: BookAuthor, 
  foreignKey: 'bookId',
  as: 'authors'
});
Author.belongsToMany(Book, { 
  through: BookAuthor, 
  foreignKey: 'authorId',
  as: 'books'
});

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

// User <-> Friendship (self-referencing many-to-many for friends)
User.hasMany(Friendship, { foreignKey: 'userId', as: 'sentRequests' });
User.hasMany(Friendship, { foreignKey: 'friendId', as: 'receivedRequests' });
Friendship.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Friendship.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });

module.exports = {
  sequelize,
  User,
  Book,
  Author,
  BookAuthor,
  UserBook,
  ReadHistory,
  Achievement,
  UserAchievement,
  Friendship,
};
