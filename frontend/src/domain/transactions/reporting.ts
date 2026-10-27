import type { Transaction } from "./types";
import { isCalendarDate } from "./dates";

export type ReportRange = { start: string; end: string };
export type MonthlySummary = {
  month: string;
  income: number;
  expenses: number;
};

export function getReportRangeError({ start, end }: ReportRange): string {
  if ((start && !isCalendarDate(start)) || (end && !isCalendarDate(end))) {
    return "Enter valid start and end dates.";
  }
  if (start && end && start > end) {
    return "Start date must be on or before end date.";
  }
  return "";
}

export function summarizeCategories(transactions: readonly Transaction[]) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? 0) + transaction.amount,
    );
  }
  return [...totals.entries()].sort(
    ([firstCategory, first], [secondCategory, second]) =>
      second - first || firstCategory.localeCompare(secondCategory),
  );
}

export function createTransactionReport(
  expenses: readonly Transaction[],
  income: readonly Transaction[],
  range: ReportRange,
) {
  const rangeError = getReportRangeError(range);
  if (rangeError) throw new Error(rangeError);

  function inRange(transaction: Transaction): boolean {
    // Match the calendar date used by the transaction editor, not the browser timezone.
    const date = typeof transaction.date === "string"
      ? transaction.date.slice(0, 10)
      : "";
    if (!isCalendarDate(date)) {
      throw new Error(
        "Reports require a valid date for every transaction. Correct undated or invalid transactions before generating a report.",
      );
    }
    return (!range.start || date >= range.start) &&
      (!range.end || date <= range.end);
  }

  const filteredExpenses = expenses.filter(inRange);
  const filteredIncome = income.filter(inRange);
  const months = new Map<string, MonthlySummary>();

  function add(transactions: Transaction[], field: "income" | "expenses") {
    let total = 0;
    for (const transaction of transactions) {
      total += transaction.amount;
      const month = transaction.date.slice(0, 7);
      const summary = months.get(month) ?? { month, income: 0, expenses: 0 };
      summary[field] += transaction.amount;
      months.set(month, summary);
    }
    return total;
  }

  const totalExpenses = add(filteredExpenses, "expenses");
  const totalIncome = add(filteredIncome, "income");

  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    transactionCount: filteredExpenses.length + filteredIncome.length,
    categories: summarizeCategories(filteredExpenses),
    months: [...months.values()].sort((first, second) =>
      first.month.localeCompare(second.month),
    ),
  };
}
