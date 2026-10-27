import { getApiErrorMessage } from "../../application/api";
import { formatCurrency, summarizeCategories } from "../../domain/transactions";
import { useGetExpensesQuery } from "../../features/expenses";
import { useGetIncomeQuery } from "../../features/income";

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  valueClassName: string;
};

function SummaryCard({
  label,
  value,
  description,
  valueClassName,
}: SummaryCardProps) {
  return (
    <article className='rounded-lg border border-slate-700 bg-slate-800 p-5'>
      <h2 className='text-sm font-medium text-slate-300'>{label}</h2>
      <p className={`mt-3 text-2xl font-semibold ${valueClassName}`}>{value}</p>
      <p className='mt-2 text-sm text-slate-400'>{description}</p>
    </article>
  );
}

const DasboardPage = () => {
  const expensesQuery = useGetExpensesQuery();
  const incomeQuery = useGetIncomeQuery();
  const expenses = expensesQuery.data;
  const income = incomeQuery.data;
  const totalExpenses =
    expenses?.reduce((total, transaction) => total + transaction.amount, 0) ??
    null;
  const totalIncome =
    income?.reduce((total, transaction) => total + transaction.amount, 0) ??
    null;
  const balance =
    totalIncome !== null && totalExpenses !== null
      ? totalIncome - totalExpenses
      : null;
  const categories = summarizeCategories(expenses ?? []);
  const hasTransactions =
    expenses !== undefined && income !== undefined
      ? expenses.length + income.length > 0
      : false;
  const isLoading = expensesQuery.isLoading || incomeQuery.isLoading;
  const expensesError = expensesQuery.error
    ? getApiErrorMessage(expensesQuery.error)
    : "";
  const incomeError = incomeQuery.error
    ? getApiErrorMessage(incomeQuery.error)
    : "";

  return (
    <section className='mx-auto w-full max-w-5xl space-y-8'>
      <header className='border-b border-slate-700 pb-5'>
        <p className='text-sm font-medium uppercase tracking-wide text-cyan-400'>
          OVERVIEW
        </p>
        <h1 className='mt-2 text-3xl font-semibold text-white'>Dashboard</h1>
        <p className='mt-2 text-sm text-slate-300'>
          A summary of all recorded income and expenses.
        </p>
      </header>

      {isLoading && (
        <p role='status' className='text-sm text-slate-300'>
          Loading dashboard...
        </p>
      )}
      {expensesError && (
        <p role='alert' className='text-sm text-rose-300'>
          Could not load expenses: {expensesError}
        </p>
      )}
      {incomeError && (
        <p role='alert' className='text-sm text-rose-300'>
          Could not load income: {incomeError}
        </p>
      )}

      {!isLoading && (
        <>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <SummaryCard
              label='Total income'
              value={totalIncome === null ? "Unavailable" : formatCurrency(totalIncome)}
              description={
                income === undefined
                  ? "Income data could not be loaded."
                  : `${income.length} recorded ${income.length === 1 ? "transaction" : "transactions"}`
              }
              valueClassName='text-emerald-400'
            />
            <SummaryCard
              label='Total expenses'
              value={
                totalExpenses === null
                  ? "Unavailable"
                  : formatCurrency(totalExpenses)
              }
              description={
                expenses === undefined
                  ? "Expense data could not be loaded."
                  : `${expenses.length} recorded ${expenses.length === 1 ? "transaction" : "transactions"}`
              }
              valueClassName='text-rose-400'
            />
            <SummaryCard
              label='Current balance'
              value={balance === null ? "Unavailable" : formatCurrency(balance)}
              description={
                balance === null
                  ? "Both income and expenses are required."
                  : "Total income minus total expenses"
              }
              valueClassName={
                balance === null
                  ? "text-slate-300"
                  : balance >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
              }
            />
          </div>

          <section
            aria-labelledby='expense-categories-heading'
            className='rounded-lg border border-slate-700 bg-slate-800 p-5'
          >
            <h2
              id='expense-categories-heading'
              className='text-lg font-semibold text-white'
            >
              Expenses by category
            </h2>
            {expenses === undefined ? (
              <p className='mt-4 text-sm text-slate-300'>
                Category totals are unavailable because expenses could not be
                loaded.
              </p>
            ) : categories.length === 0 ? (
              <p className='mt-4 text-sm text-slate-300'>
                No expenses recorded yet.
              </p>
            ) : (
              <ul className='mt-5 space-y-4'>
                {categories.map(([category, amount]) => (
                  <li key={category}>
                    <div className='flex justify-between gap-4 text-sm'>
                      <span className='text-slate-200'>{category}</span>
                      <span className='font-medium text-white'>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div
                      aria-hidden='true'
                      className='mt-2 h-2 overflow-hidden rounded-full bg-slate-700'
                    >
                      <div
                        className='h-full rounded-full bg-rose-400'
                        style={{
                          width: `${totalExpenses ? (amount / totalExpenses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!hasTransactions && !expensesError && !incomeError && (
            <p className='text-sm text-slate-400'>
              Add expenses or income to see your financial overview.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default DasboardPage;
