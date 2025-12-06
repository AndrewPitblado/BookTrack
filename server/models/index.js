const sequelize = require('../config/database');
const User = require('./User');
const Book = require('./Book');
const Achievement = require('./Achievement');
const UserAchievement = require('./UserAchievement');
const UserProgress = require('./UserProgress');
const Author = require('./Author');
const AuthorBook = require('./AuthorBook');

// User <-> UserProgress <-> Book
User.hasMany(UserProgress, { foreignKey: 'userId', as: 'progress' });
UserProgress.belongsTo(User, { foreignKey: 'userId' });

Book.hasMany(UserProgress, { foreignKey: 'bookId', as: 'progress' });
UserProgress.belongsTo(Book, { foreignKey: 'bookId' });

// User <-> UserAchievement <-> Achievement
User.belongsToMany(Achievement, { 
  through: UserAchievement, 
  foreignKey: 'userId', 
  otherKey: 'achievementId',
  as: 'achievements' 
});

Achievement.belongsToMany(User, { 
  through: UserAchievement, 
  foreignKey: 'achievementId', 
  otherKey: 'userId',
  as: 'users' 
});

// Author <-> AuthorBook <-> Book
Author.belongsToMany(Book, { 
  through: AuthorBook, 
  foreignKey: 'authorId', 
  otherKey: 'bookId',
  as: 'books' 
});

Book.belongsToMany(Author, { 
  through: AuthorBook, 
  foreignKey: 'bookId', 
  otherKey: 'authorId',
  as: 'authorList' 
});

module.exports = {
  sequelize,
  User,
  Book,
  Achievement,
  UserAchievement,
  UserProgress,
  Author,
  AuthorBook,
};
