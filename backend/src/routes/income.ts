import { Router } from "express";
import * as incomeController from "../controllers/incomeController";

const router = Router();

router.get("/", incomeController.getAllIncomes);
router.post("/", incomeController.createIncome);
router.put("/:id", incomeController.updateIncome);
router.delete("/:id", incomeController.deleteIncome);

export default router;
