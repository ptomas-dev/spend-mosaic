import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { expensesApi } from "../features/expenses/api";
import { ReportsPage } from "../pages/ReportsPage";
import { createResponseGate, server } from "./server";
import { renderTransactionPage, renderWithStore } from "./workflows";

const expenses = [
  { id: 1, date: "2026-01-10", amount: 25, category: "Food", memo: "" },
  { id: 2, date: "2026-01-31", amount: 15, category: "Food", memo: "" },
  { id: 3, date: "2026-02-15", amount: 70, category: "Travel", memo: "" },
];
const income = [
  { id: 1, date: "2026-01-01", amount: 100, category: "Salary", memo: "" },
  { id: 2, date: "2026-02-01", amount: 50, category: "Salary", memo: "" },
];

function useRecords() {
  server.use(
    http.get("http://localhost/expenses", () => HttpResponse.json(expenses)),
    http.get("http://localhost/income", () => HttpResponse.json(income)),
  );
}

describe("ReportsPage", () => {
  it("shows all-time summaries, monthly comparisons and category totals", async () => {
    useRecords();
    renderTransactionPage(ReportsPage);
    const table = within(await screen.findByRole("table"));
    expect(table.getAllByRole("row")).toHaveLength(3);
    expect(table.getByRole("row", { name: /Jan 2026/ })).toHaveTextContent(
      "Jan 2026€100.00€40.00€60.00",
    );
    expect(table.getByRole("row", { name: /Feb 2026/ })).toHaveTextContent(
      "Feb 2026€50.00€70.00-€20.00",
    );
    expect(screen.getByLabelText("Report totals")).toHaveTextContent(
      "Total income€150.00Total expenses€110.00Net balance€40.00",
    );
    const categories = within(screen.getByRole("region", { name: "Expenses by category" }));
    expect(categories.getAllByRole("listitem").map((item) => item.textContent))
      .toEqual(["Travel€70.00", "Food€40.00"]);
  });

  it("filters both sources inclusively, validates bounds, and resets to all time", async () => {
    useRecords();
    const user = renderTransactionPage(ReportsPage);
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "10/01/2026" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "31/01/2026" } });
    const table = within(screen.getByRole("table"));
    expect(table.getAllByRole("row")).toHaveLength(2);
    expect(table.getByRole("row", { name: /Jan 2026/ })).toHaveTextContent(
      "Jan 2026€0.00€40.00-€40.00",
    );
    expect(screen.queryByText("Travel")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "01/02/2026" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Start date must be on or before end date.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All time" }));
    expect(screen.getByLabelText("Start date")).toHaveValue("");
    expect(screen.getByLabelText("End date")).toHaveValue("");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(3);
  });

  it("scales fractional amounts against the largest total, not a one-euro minimum", async () => {
    server.use(
      http.get("http://localhost/expenses", () => HttpResponse.json([
        { ...expenses[0], amount: 0.1 },
      ])),
      http.get("http://localhost/income", () => HttpResponse.json([
        { ...income[0], amount: 0.2 },
      ])),
    );
    renderTransactionPage(ReportsPage);
    await screen.findByRole("table");
    const chart = screen.getByRole("region", { name: "Monthly income vs. expenses" });
    const bars = chart.querySelectorAll('[aria-hidden="true"] .h-full');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "50%" });
  });

  it("waits for both lists instead of showing a partial financial report", async () => {
    const gate = createResponseGate();
    server.use(http.get("http://localhost/income", async () => {
      await gate.ready;
      return HttpResponse.json(income);
    }));
    renderTransactionPage(ReportsPage);
    try {
      expect(screen.getByRole("status")).toHaveTextContent("Loading reports...");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    } finally {
      gate.release();
    }
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText("No expenses in this date range.")).toBeInTheDocument();
  });

  it("shows an empty state and zero totals, including for a range without matches", async () => {
    useRecords();
    renderTransactionPage(ReportsPage);
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "01/01/2027" } });
    expect(screen.getByText("No transactions in this date range.")).toBeInTheDocument();
    expect(screen.getAllByText("€0.00")).toHaveLength(3);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it.each(["expenses", "income"])("surfaces %s failures and can retry", async (resource) => {
    useRecords();
    server.use(http.get(`http://localhost/${resource}`, () =>
      HttpResponse.json({ error: "Service unavailable" }, { status: 503 }),
    ));
    const user = renderTransactionPage(ReportsPage);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      `Could not load ${resource}: Service unavailable`,
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    useRecords();
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh data" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Refresh data" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retains cached reports with a stale warning after refresh fails", async () => {
    useRecords();
    const user = renderTransactionPage(ReportsPage);
    await screen.findByRole("table");
    server.use(http.get("http://localhost/expenses", () => HttpResponse.error()));
    await user.click(screen.getByRole("button", { name: "Refresh data" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load expenses");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText(/Showing cached data/)).toBeInTheDocument();
  });

  it("keeps reports visible and disables duplicate refreshes while updating", async () => {
    useRecords();
    const user = renderTransactionPage(ReportsPage);
    await screen.findByRole("table");
    const gate = createResponseGate();
    server.use(http.get("http://localhost/expenses", async () => {
      await gate.ready;
      return HttpResponse.json(expenses);
    }));
    try {
      await user.click(screen.getByRole("button", { name: "Refresh data" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Updating reports...");
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Refresh data" })).toBeDisabled();
    } finally {
      gate.release();
    }
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("updates reports after a successful expense mutation invalidates the list", async () => {
    const records = [...expenses];
    server.use(
      http.get("http://localhost/expenses", () => HttpResponse.json(records)),
      http.get("http://localhost/income", () => HttpResponse.json(income)),
      http.post("http://localhost/expenses", async ({ request }) => {
        const payload = await request.json() as typeof expenses[number];
        const added = { ...payload, id: 4 };
        records.push(added);
        return HttpResponse.json(added);
      }),
    );
    const { store } = renderWithStore(<ReportsPage />);
    await screen.findByRole("table");
    await act(async () => {
      await store.dispatch(expensesApi.endpoints.createExpense.initiate({
        date: "2026-02-20", amount: 10, category: "Food", memo: "",
      })).unwrap();
    });
    await waitFor(() => expect(
      within(screen.getByRole("table")).getByRole("row", { name: /Feb 2026/ }),
    ).toHaveTextContent("Feb 2026€50.00€80.00-€30.00"));
  });

  it("reports invalid stored dates instead of silently omitting transactions", async () => {
    server.use(http.get("http://localhost/expenses", () => HttpResponse.json([
      { ...expenses[0], date: null },
    ])));
    renderTransactionPage(ReportsPage);
    expect(await screen.findByRole("alert")).toHaveTextContent("Reports require a valid date");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
