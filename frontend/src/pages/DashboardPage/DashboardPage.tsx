import { useEffect, useState } from "react";

type CategoryTotal = {
  category: string;
  amount: number;
};

type Summary = {
  income: number;
  expenses: number;
  expenseCategories: CategoryTotal[];
  incomeCategories: CategoryTotal[];
};

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: Summary };

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
});

const percentageFormatter = new Intl.NumberFormat("en-GB", {
  style: "percent",
  maximumFractionDigits: 1,
});

const categoryColors = [
  "bg-emerald-400",
  "bg-sky-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-teal-300",
  "bg-indigo-300",
];

const loadTransactions = async (endpoint: string, signal: AbortSignal) => {
  const response = await fetch(endpoint, { signal });

  if (!response.ok) {
    throw new Error("Could not load the dashboard. Please try again.");
  }

  const records: unknown = await response.json();

  if (!Array.isArray(records)) {
    throw new Error("The server returned invalid dashboard data.");
  }

  return records.map((record: unknown) => {
    if (
      typeof record !== "object" ||
      record === null ||
      !("amount" in record) ||
      (typeof record.amount !== "number" &&
        typeof record.amount !== "string") ||
      String(record.amount).trim() === "" ||
      !Number.isFinite(Number(record.amount))
    ) {
      throw new Error("The server returned invalid dashboard data.");
    }

    return {
      amount: Math.round(Number(record.amount) * 100),
      category:
        "category" in record && typeof record.category === "string"
          ? record.category.trim() || "Uncategorized"
          : "Uncategorized",
    };
  });
};

const groupByCategory = (
  transactions: { category: string; amount: number }[],
) => {
  const categoryTotals = new Map<string, number>();

  for (const transaction of transactions) {
    categoryTotals.set(
      transaction.category,
      (categoryTotals.get(transaction.category) ?? 0) + transaction.amount,
    );
  }

  return Array.from(categoryTotals, ([category, amount]) => ({
    category,
    amount: amount / 100,
  })).sort(
    (first, second) =>
      second.amount - first.amount ||
      first.category.localeCompare(second.category),
  );
};

const DashboardPage = () => {
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadSummary = async () => {
      setState({ status: "loading" });

      try {
        const [incomes, expenses] = await Promise.all([
          loadTransactions("/income", controller.signal),
          loadTransactions("/expenses", controller.signal),
        ]);

        const summary: Summary = {
          income:
            incomes.reduce((total, income) => total + income.amount, 0) / 100,
          expenses:
            expenses.reduce((total, expense) => total + expense.amount, 0) /
            100,
          expenseCategories: groupByCategory(expenses),
          incomeCategories: groupByCategory(incomes),
        };

        if (!controller.signal.aborted) {
          setState({ status: "ready", summary });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not load the dashboard. Please try again.",
          });
        }
      }
    };

    void loadSummary();

    return () => controller.abort();
  }, [attempt]);

  return (
    <section className='mx-auto w-full max-w-5xl space-y-8'>
      <header className='border-b border-slate-700 pb-5'>
        <h1 className='text-3xl font-semibold text-white'>Dashboard</h1>
        <p className='mt-2 text-sm text-slate-300'>All-time summary</p>
      </header>

      {state.status === "loading" && (
        <p role='status' className='text-slate-300'>
          Loading dashboard...
        </p>
      )}

      {state.status === "error" && (
        <div className='space-y-4'>
          <p role='alert' className='text-red-300'>
            {state.message}
          </p>
          <button
            type='button'
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((currentAttempt) => currentAttempt + 1);
            }}
            className='rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'
          >
            Try again
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <dl className='grid gap-4 md:grid-cols-3'>
            {[
              {
                label: "Total income",
                amount: state.summary.income,
                color: "text-emerald-400",
              },
              {
                label: "Total expenses",
                amount: state.summary.expenses,
                color: "text-red-300",
              },
              {
                label: "Balance",
                amount: state.summary.income - state.summary.expenses,
                color:
                  state.summary.income >= state.summary.expenses
                    ? "text-emerald-400"
                    : "text-red-300",
              },
            ].map(({ label, amount, color }) => (
              <div
                key={label}
                className='min-w-0 rounded border border-slate-700 bg-slate-800 p-5'
              >
                <dt className='text-sm text-slate-300'>{label}</dt>
                <dd
                  className={`mt-3 break-all text-2xl font-semibold tabular-nums ${color}`}
                >
                  {currencyFormatter.format(amount)}
                </dd>
              </div>
            ))}
          </dl>
          {[
            {
              id: "expense-category-chart-heading",
              title: "Expenses by category",
              categories: state.summary.expenseCategories,
              total: state.summary.expenses,
              emptyMessage: "No expenses yet.",
            },
            {
              id: "income-category-chart-heading",
              title: "Income by category",
              categories: state.summary.incomeCategories,
              total: state.summary.income,
              emptyMessage: "No income yet.",
            },
          ].map(({ id, title, categories, total, emptyMessage }) => (
            <section
              key={id}
              aria-labelledby={id}
              className='min-w-0 border-t border-slate-700 pt-6'
            >
              <h2 id={id} className='text-xl font-semibold text-white'>
                {title}
              </h2>
              {categories.length === 0 ? (
                <p className='mt-4 text-sm text-slate-300'>{emptyMessage}</p>
              ) : (
                <ul className='mt-6 space-y-5'>
                  {categories.map(({ category, amount }, index) => {
                    const share = total > 0 ? amount / total : 0;

                    return (
                      <li key={category} className='min-w-0 space-y-2'>
                        <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm'>
                          <span className='min-w-0 break-words font-medium text-slate-200 [overflow-wrap:anywhere]'>
                            {category}
                          </span>
                          <span className='flex flex-wrap gap-x-3 tabular-nums'>
                            <span className='text-white'>
                              {currencyFormatter.format(amount)}
                            </span>
                            <span className='text-slate-400'>
                              {percentageFormatter.format(share)}
                            </span>
                          </span>
                        </div>
                        <div
                          aria-hidden='true'
                          className='h-3 overflow-hidden rounded-sm bg-slate-700'
                        >
                          <div
                            className={`h-full rounded-sm ${categoryColors[index % categoryColors.length]}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, share * 100))}%`,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </>
      )}
    </section>
  );
};

export default DashboardPage;
