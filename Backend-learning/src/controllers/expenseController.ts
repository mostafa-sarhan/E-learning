import { Request, Response } from "express";
import ExpenseModel from "../models/expenseModel";

export async function getExpenses(req: Request, res: Response): Promise<void> {
  try {
    const expenses = await ExpenseModel.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    const { title, amount } = req.body;

    if (!title || amount === undefined) {
      res.status(400).json({ message: "title and amount are required." });
      return;
    }

    const newExpense = await ExpenseModel.create({
      title: title.trim(),
      amount: Number(amount),
      date: new Date(),
    });

    res.status(201).json(newExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await ExpenseModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Expense not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}
