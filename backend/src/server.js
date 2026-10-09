const express = require("express");
require("dotenv").config();
const sequelize = require("./config/database");
const expensesRouter = require("./routes/expenses");
const incomeRouter = require("./routes/income");

const app = express();
const port = 5000;

sequelize
  .sync(/*{ alter: true }*/)
  .then(() => {
    console.log("Database synced!");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });

app.use(express.json());
app.use("/expenses", expensesRouter);
app.use("/income", incomeRouter);

app.get("/", function (req, res) {
  res.send("Hello World!");
});
