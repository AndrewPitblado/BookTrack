const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Goal = sequelize.define(
  "Goal",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("daily", "weekly", "monthly", "yearly"),
      allowNull: false,
    },
    metric: {
      type: DataTypes.ENUM("pages", "books"),
      allowNull: false,
    },
    target: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "goals",
    timestamps: true,
  },
);

module.exports = Goal;
