const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BookAuthor = sequelize.define('BookAuthor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
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
  indexes: [
    {
      unique: true,
      fields: ['bookId', 'authorId']
    }
  ]
});

module.exports = BookAuthor;