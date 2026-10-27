import { DataTypes } from "sequelize";
import sequelize from "../config/database";
import type { TransactionModel } from "./transaction";

const Income = sequelize.define<TransactionModel>("Income", {
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

export default Income;
