const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAchievement = sequelize.define('UserAchievement', {
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'user_id'
  },
  achievementId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'achievement_id'
  },
  date_earned: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: true,
  }
}, {
  tableName: 'user_achievement',
  timestamps: false,
});

module.exports = UserAchievement;
