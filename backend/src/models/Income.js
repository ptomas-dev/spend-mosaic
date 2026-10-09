const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Income = sequelize.define("Income", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  memo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
});

module.exports = Income;
