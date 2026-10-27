import type { Model, Optional } from "sequelize";

export interface TransactionAttributes {
  id: number;
  date: Date | string | null;
  amount: number;
  category: string;
  memo: string | null;
}

export type TransactionCreationAttributes = Optional<
  Omit<TransactionAttributes, "amount"> & { amount: number | string },
  "id" | "date" | "memo"
>;

export interface TransactionModel
  extends Model<TransactionAttributes, TransactionCreationAttributes>,
    TransactionAttributes {
  createdAt: Date;
  updatedAt: Date;
}
