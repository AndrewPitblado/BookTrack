const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ReadHistory = sequelize.define(
  "ReadHistory",
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
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
      validate: {
        min: 0.5,
        max: 5,
        isHalfStep(value) {
          if (value === null || value === undefined) return;
          const numeric = Number(value);
          if (!Number.isFinite(numeric)) {
            throw new Error("Rating must be a number");
          }
          if (!Number.isInteger(numeric * 2)) {
            throw new Error("Rating must be in 0.5 increments");
          }
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "read_history",
    timestamps: true,
  },
);

module.exports = ReadHistory;
