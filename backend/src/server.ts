import "dotenv/config";
import express from "express";
import sequelize from "./config/database";
import expensesRouter from "./routes/expenses";
import incomeRouter from "./routes/income";

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
