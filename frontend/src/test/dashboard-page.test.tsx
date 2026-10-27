import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { DashboardPage } from "../pages/DashboardPage";
import { createResponseGate, server } from "./server";
import { renderTransactionPage } from "./workflows";

describe("DashboardPage", () => {
  it("shows totals and expense categories from both transaction lists", async () => {
    server.use(
      http.get("http://localhost/expenses", () =>
        HttpResponse.json([
          {
            id: 1,
            date: "2026-01-15",
            amount: 25,
            category: "Food",
            memo: "",
          },
          {
            id: 2,
            date: "2026-01-16",
            amount: 10,
            category: "Transport",
            memo: "",
          },
          {
            id: 3,
            date: "2026-01-17",
            amount: 5,
            category: "Food",
            memo: "",
          },
        ]),
      ),
      http.get("http://localhost/income", () =>
        HttpResponse.json([
          {
            id: 4,
            date: "2026-01-18",
            amount: 100,
            category: "Salary",
            memo: "",
          },
        ]),
      ),
    );

    renderTransactionPage(DashboardPage);

    expect(await screen.findByText("€100.00")).toBeInTheDocument();
    expect(screen.getByText("€40.00")).toBeInTheDocument();
    expect(screen.getByText("€60.00")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Expenses by category" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("1 recorded transaction")).toBeInTheDocument();
    expect(screen.getByText("3 recorded transactions")).toBeInTheDocument();
  });

  it("shows a loading status until both transaction lists load", async () => {
    const expenseGate = createResponseGate();
    const incomeGate = createResponseGate();
    server.use(
      http.get("http://localhost/expenses", async () => {
        await expenseGate.ready;
        return HttpResponse.json([]);
      }),
      http.get("http://localhost/income", async () => {
        await incomeGate.ready;
        return HttpResponse.json([]);
      }),
    );

    renderTransactionPage(DashboardPage);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading dashboard...",
    );
    expenseGate.release();
    incomeGate.release();

    expect(
      await screen.findByText("No expenses recorded yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports failed requests without presenting incomplete totals as complete", async () => {
    server.use(
      http.get("http://localhost/expenses", () =>
        HttpResponse.json({ error: "Expense service unavailable" }, { status: 503 }),
      ),
      http.get("http://localhost/income", () =>
        HttpResponse.json([
          {
            id: 1,
            date: "2026-01-18",
            amount: 100,
            category: "Salary",
            memo: "",
          },
        ]),
      ),
    );

    renderTransactionPage(DashboardPage);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load expenses: Expense service unavailable",
    );
    expect(screen.getByText("Total income")).toBeInTheDocument();
    expect(screen.getByText("€100.00")).toBeInTheDocument();
    expect(screen.getByText("Total expenses")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
    expect(
      screen.getByText(
        "Category totals are unavailable because expenses could not be loaded.",
      ),
    ).toBeInTheDocument();
  });
});
