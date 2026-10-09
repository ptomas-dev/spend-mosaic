const Income = require("../models/Income");

exports.getAllIncomes = async function (req, res) {
  try {
    const incomes = await Income.findAll();
    res.status(200).json(incomes);
  } catch (error) {
    console.error("Error retrieving incomes:", error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving incomes" });
  }
};

exports.createIncome = async function (req, res) {
  const { date, amount, category, memo } = req.body;
  const numericAmount = Number(amount);

  if (
    !date ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    !category?.trim()
  ) {
    return res
      .status(400)
      .json({ error: "Date, positive amount, and category are required" });
  }

  try {
    const income = await Income.create({
      date,
      amount: numericAmount,
      category: category.trim(),
      memo,
    });

    res.status(201).json(income);
  } catch (error) {
    console.error("Error creating income:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the income" });
  }
};

exports.deleteIncome = async function (req, res) {
  const incomeId = req.params.id;

  if (!incomeId) {
    return res.status(400).json({ error: "Income id is mandatory" });
  }

  try {
    const deleteCount = await Income.destroy({
      where: { id: incomeId },
    });

    if (deleteCount === 0) {
      return res.status(404).json({ error: "Income not found" });
    }

    return res.status(200).json({ message: "Income deleted successfully" });
  } catch (error) {
    console.error("Error deleting income:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while deleting the income" });
  }
};
