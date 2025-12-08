const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuthorBook = sequelize.define('AuthorBook', {
  authorId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'author_id'
  },
  bookId: {
    type: DataTypes.STRING(13),
    primaryKey: true,
    field: 'book_id'
  }
}, {
  tableName: 'author_book',
  timestamps: false,
});

module.exports = AuthorBook;