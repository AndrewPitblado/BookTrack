const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DeviceToken = sequelize.define(
  "DeviceToken",
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
    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    platform: {
      type: DataTypes.ENUM("ios", "android"),
      allowNull: false,
      defaultValue: "ios",
    },
  },
  {
    tableName: "device_tokens",
    timestamps: true,
    indexes: [{ unique: true, fields: ["token"] }, { fields: ["userId"] }],
  },
);

module.exports = DeviceToken;
