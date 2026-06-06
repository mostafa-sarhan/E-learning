import { Schema, model } from "mongoose";

const expenseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ExpenseModel = model("Expense", expenseSchema);

export default ExpenseModel;
