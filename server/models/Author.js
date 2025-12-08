const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Author = sequelize.define('Author', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'author_id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'author',
  timestamps: false,
});

module.exports = Author;