const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Book = sequelize.define('Book', {
  isbn: {
    type: DataTypes.STRING(13),
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  authors: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  pageCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'page_count'
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  publishedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'published_date'
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'author_id'
  }
}, {
  tableName: 'books',
  timestamps: false,
});

module.exports = Book;
