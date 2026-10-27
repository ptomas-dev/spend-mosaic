import { describe, expect, it } from "vitest";
import {
  createTransactionReport,
  getReportRangeError,
  summarizeCategories,
  type Transaction,
} from "../domain/transactions";

function transaction(date: string, amount: number, category = "Food"): Transaction {
  return { id: 1, date, amount, category, memo: "" };
}

describe("transaction reporting", () => {
  it("aggregates and orders months across years without changing input", () => {
    const expenses = [
      transaction("2026-02-01", 20, "Travel"),
      transaction("2025-12-31", 10),
      transaction("2026-02-02", 5),
    ];
    const original = structuredClone(expenses);
    const report = createTransactionReport(
      expenses,
      [transaction("2026-02-03", 100), transaction("2026-01-01", 50)],
      { start: "", end: "" },
    );
    expect(report).toEqual({
      totalExpenses: 35,
      totalIncome: 150,
      balance: 115,
      transactionCount: 5,
      categories: [["Travel", 20], ["Food", 15]],
      months: [
        { month: "2025-12", income: 0, expenses: 10 },
        { month: "2026-01", income: 50, expenses: 0 },
        { month: "2026-02", income: 100, expenses: 25 },
      ],
    });
    expect(expenses).toEqual(original);
  });

  it("includes both boundaries using the stored calendar date of timestamps", () => {
    const report = createTransactionReport([
      transaction("2026-01-14", 1),
      transaction("2026-01-15T00:00:00+12:00", 2),
      transaction("2026-01-31T23:59:59-08:00", 3),
      transaction("2026-02-01", 4),
    ], [], { start: "2026-01-15", end: "2026-01-31" });
    expect(report.totalExpenses).toBe(5);
    expect(report.transactionCount).toBe(2);
    expect(report.balance).toBe(-5);
  });

  it.each([
    [{ start: "2026-02-01", end: "" }, 20],
    [{ start: "", end: "2026-01-31" }, 10],
    [{ start: "2026-03-01", end: "" }, 0],
  ])("supports one-sided ranges and no matches: %j", (range, expected) => {
    expect(createTransactionReport([
      transaction("2026-01-31", 10),
      transaction("2026-02-01", 20),
    ], [], range).totalExpenses).toBe(expected);
  });

  it("returns empty summaries without NaN for no records", () => {
    expect(createTransactionReport([], [], { start: "", end: "" })).toEqual({
      totalExpenses: 0, totalIncome: 0, balance: 0,
      transactionCount: 0, categories: [], months: [],
    });
  });

  it.each(["2026-02-30", "invalid", "2026-13-01"])("rejects invalid date %s", (date) => {
    expect(() => createTransactionReport([transaction(date, 1)], [], {
      start: "", end: "",
    })).toThrow("Reports require a valid date");
    expect(getReportRangeError({ start: date, end: "" })).toBe(
      "Enter valid start and end dates.",
    );
  });

  it("rejects reversed bounds and accepts leap days", () => {
    expect(() => createTransactionReport([], [], {
      start: "2026-02-01", end: "2026-01-01",
    })).toThrow("Start date must be on or before end date.");
    expect(getReportRangeError({ start: "2024-02-29", end: "2024-02-29" })).toBe("");
  });

  it("handles category names safely and sorts equal totals deterministically", () => {
    expect(summarizeCategories([
      transaction("2026-01-01", 2, "__proto__"),
      transaction("2026-01-02", 3, "__proto__"),
      transaction("2026-01-03", 5, "A"),
    ])).toEqual([["__proto__", 5], ["A", 5]]);
  });
});
