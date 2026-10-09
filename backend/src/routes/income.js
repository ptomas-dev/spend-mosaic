const express = require("express");
const router = express.Router();
const incomeController = require("../controllers/incomeController");

router.get("/", incomeController.getAllIncomes);
router.post("/", incomeController.createIncome);
router.put("/:id", incomeController.updateIncome);
router.delete("/:id", incomeController.deleteIncome);

module.exports = router;
