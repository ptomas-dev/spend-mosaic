import { Router } from "express";
import * as expensesController from "../controllers/expensesController";

const router = Router();

router.get("/", expensesController.getAllExpenses);
router.get("/:id", expensesController.getExpenseById);
router.post("/", expensesController.createExpense);
router.put("/:id", expensesController.updateExpense);
router.delete("/:id", expensesController.deleteExpense);

export default router;
