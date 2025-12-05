const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  googleBooksId: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  authors: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  thumbnail: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  pageCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  publishedDate: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  categories: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
}, {
  tableName: 'books',
  timestamps: true,
});

module.exports = Book;
