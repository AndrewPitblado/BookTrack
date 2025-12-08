const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BookAuthor = sequelize.define('BookAuthor', {
  bookId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'book_authors',
  timestamps: false,
});

module.exports = BookAuthor;