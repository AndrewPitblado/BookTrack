const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'achievement_id'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  icon_logo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  rarity: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  trigger_event: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  condition_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  condition_value: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'achievement',
  timestamps: false,
});

module.exports = Achievement;
