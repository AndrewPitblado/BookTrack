const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  criteria: {
    type: DataTypes.JSON,
    allowNull: true,
    // Example: { type: 'books_finished', count: 5 }
  },
  tier: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
    defaultValue: 'bronze',
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  isSecret: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
}, {
  tableName: 'achievements',
  timestamps: true,
});

module.exports = Achievement;
