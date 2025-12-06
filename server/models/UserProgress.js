const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProgress = sequelize.define('UserProgress', {
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    field: 'user_id'
  },
  bookId: {
    type: DataTypes.STRING(13),
    primaryKey: true,
    allowNull: false,
    field: 'book_id'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  currentPage: {
    type: DataTypes.INTEGER,
    field: 'current_page'
  },
  totalPages: {
    type: DataTypes.INTEGER,
    field: 'total_pages'
  }
}, {
  tableName: 'user_progress',
  timestamps: true,
});

module.exports = UserProgress;
