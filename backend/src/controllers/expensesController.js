const Expense = require("../models/Expense");

exports.getAllExpenses = async function (req, res) {
  try {
    const expenses = await Expense.findAll();
    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error retrieving expenses:", error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving expenses" });
  }
};

exports.getExpenseById = async function (req, res) {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ error: "Expense id not provided" });
  }

  try {
    const expense = await Expense.findByPk(id);
    res.status(200).json(expense);
  } catch (error) {
    console.error("Error retrieving expenses:", error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving expenses" });
  }
};

exports.createExpense = function (req, res) {
  const { date, amount, category, memo } = req.body;

  if (!date || !amount || !category) {
    return res.status(400).json({ error: "All fields are required" });
  }

  Expense.create({
    date,
    amount,
    category,
    memo,
  })
    .then((expense) => res.status(201).json(expense))
    .catch((err) => res.status(500).json({ err }));
};

exports.updateExpense = async function (req, res) {
  const { date, amount, category, memo } = req.body;
  const id = req.params.id;

  const expense = await Expense.findByPk(id);

  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }

  await expense
    .update({
      date: date || expense.date,
      amount: amount || expense.amount,
      category: category || expense.category,
      memo: memo || expense.memo,
    })
    .then((expense) => {
      res
        .status(200)
        .json({ message: "Expense updated successfully", expense });
    })
    .catch((error) => {
      console.error("Error updating expense:", error);
      res
        .status(500)
        .json({ error: "An error occurred while retrieving expenses" });
    });
};

exports.deleteExpense = async function (req, res) {
  const expenseId = req.params.id;

  if (!expenseId) {
    return res.status(400).json({ error: "Expense id is mandatory" });
  }

  try {
    const deleteCount = await Expense.destroy({
      where: { id: expenseId },
    });

    if (deleteCount === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the expense" });
  }
};
