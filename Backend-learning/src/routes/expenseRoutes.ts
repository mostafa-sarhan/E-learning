import express from "express";
import { getExpenses, createExpense, deleteExpense } from "../controllers/expenseController";
import { guardObjectIdParams } from "../middleware/auth";

const router = express.Router();
guardObjectIdParams(router);

router.get("/", getExpenses);
router.post("/", createExpense);
router.delete("/:id", deleteExpense);

export default router;
