import { useState } from "react";
import { DateInput } from "../../components/DateInput/DateInput";
import { getApiErrorMessage } from "../../application/api";
import {
  createTransactionReport,
  formatCurrency,
  getReportRangeError,
} from "../../domain/transactions";
import { useGetExpensesQuery } from "../../features/expenses";
import { useGetIncomeQuery } from "../../features/income";

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatMonth(month: string) {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

const ReportsPage = () => {
  const expensesQuery = useGetExpensesQuery();
  const incomeQuery = useGetIncomeQuery();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const rangeError = getReportRangeError({ start, end });
  const isFetching = expensesQuery.isFetching || incomeQuery.isFetching;
  const hasData =
    expensesQuery.data !== undefined && incomeQuery.data !== undefined;
  const hasError = Boolean(expensesQuery.error || incomeQuery.error);
  let report: ReturnType<typeof createTransactionReport> | undefined;
  let reportError = "";
  if (
    !rangeError &&
    expensesQuery.data !== undefined &&
    incomeQuery.data !== undefined
  ) {
    try {
      report = createTransactionReport(expensesQuery.data, incomeQuery.data, {
        start,
        end,
      });
    } catch (error) {
      reportError = getApiErrorMessage(error);
    }
  }
  const scale =
    report?.months.reduce(
      (largest, month) =>
        Math.max(largest, Math.abs(month.income), Math.abs(month.expenses)),
      0,
    ) || 1;

  return (
    <section className='mx-auto w-full max-w-5xl space-y-8'>
      <header className='border-b border-slate-700 pb-5'>
        <p className='text-sm font-medium uppercase tracking-wide text-cyan-400'>
          ANALYSIS
        </p>
        <h1 className='mt-2 text-3xl font-semibold text-white'>Reports</h1>
        <p className='mt-2 text-sm text-slate-300'>
          Compare income and expenses by month and review spending categories.
        </p>
      </header>

      <section
        aria-label='Report date range'
        className='rounded-lg border border-slate-700 bg-slate-800 p-5'
      >
        <div className='flex flex-wrap items-end gap-4'>
          <DateInput label='Start date' value={start} onChange={setStart} />
          <DateInput label='End date' value={end} onChange={setEnd} />
          <button
            type='button'
            onClick={() => {
              setStart("");
              setEnd("");
            }}
            className='rounded border border-slate-500 px-4 py-2 text-sm text-white hover:bg-slate-700'
          >
            All time
          </button>
          <button
            type='button'
            disabled={isFetching}
            onClick={() => {
              void expensesQuery.refetch();
              void incomeQuery.refetch();
            }}
            className='rounded bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600 disabled:opacity-50'
          >
            Refresh data
          </button>
        </div>
        <p id='report-range-help' className='mt-3 text-sm text-slate-400'>
          Dates are inclusive. Leave either date blank for an open-ended range.
          Reports update automatically; both blank means all time.
        </p>
        {rangeError && (
          <p
            id='report-range-error'
            role='alert'
            className='mt-3 text-sm text-rose-300'
          >
            {rangeError}
          </p>
        )}
      </section>

      {isFetching && (
        <p role='status' className='text-sm text-slate-300'>
          {hasData ? "Updating reports..." : "Loading reports..."}
        </p>
      )}
      {expensesQuery.error && (
        <p role='alert' className='text-sm text-rose-300'>
          Could not load expenses: {getApiErrorMessage(expensesQuery.error)}
        </p>
      )}
      {incomeQuery.error && (
        <p role='alert' className='text-sm text-rose-300'>
          Could not load income: {getApiErrorMessage(incomeQuery.error)}
        </p>
      )}
      {hasError && hasData && (
        <p className='text-sm text-amber-300'>
          Showing cached data. These reports may be out of date; refresh to try
          again.
        </p>
      )}
      {!hasData && !isFetching && hasError && (
        <p className='text-sm text-slate-300'>
          Both income and expenses must load before reports can be generated.
          Use Refresh data to retry.
        </p>
      )}
      {reportError && (
        <p role='alert' className='text-sm text-rose-300'>{reportError}</p>
      )}

      {report && (
        <>
          <dl aria-label='Report totals' className='grid gap-4 sm:grid-cols-3'>
            {[
              { label: "Total income", amount: report.totalIncome },
              { label: "Total expenses", amount: report.totalExpenses },
              { label: "Net balance", amount: report.balance },
            ].map(({ label, amount }) => (
              <div
                key={label}
                className='rounded-lg border border-slate-700 bg-slate-800 p-5'
              >
                <dt className='text-sm text-slate-300'>{label}</dt>
                <dd className='mt-3 break-words text-2xl font-semibold text-white'>
                  {formatCurrency(amount)}
                </dd>
              </div>
            ))}
          </dl>
          {report.transactionCount === 0 ? (
            <p className='text-sm text-slate-300'>No transactions in this date range.</p>
          ) : (
            <>
              <section
                aria-labelledby='monthly-report-heading'
                className='rounded-lg border border-slate-700 bg-slate-800 p-5'
              >
                <h2
                  id='monthly-report-heading'
                  className='text-lg font-semibold text-white'
                >
                  Monthly income vs. expenses
                </h2>
                <p className='mt-2 text-sm text-slate-300'>
                  Months with transactions only. Bars show absolute amounts on a
                  shared scale; exact signed values are in the table.
                </p>
                <div aria-hidden='true' className='mt-5 space-y-5'>
                  {report.months.map((month) => (
                    <div key={month.month}>
                      <p className='mb-2 text-sm text-slate-200'>
                        {formatMonth(month.month)}
                      </p>
                      {[
                        { label: "Income", amount: month.income, color: "bg-emerald-400" },
                        { label: "Expenses", amount: month.expenses, color: "bg-rose-400" },
                      ].map(({ label, amount, color }) => (
                        <div key={label} className='mt-2 flex items-center gap-3'>
                          <span className='w-16 shrink-0 text-xs text-slate-300'>
                            {label}
                          </span>
                          <div className='h-3 flex-1 overflow-hidden rounded bg-slate-700'>
                            <div
                              className={`h-full rounded ${color}`}
                              style={{ width: `${Math.abs(amount) / scale * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className='mt-6 overflow-x-auto'>
                  <table className='w-full text-left text-sm text-slate-200'>
                    <caption className='sr-only'>
                      Monthly totals for the selected date range
                    </caption>
                    <thead>
                      <tr className='border-b border-slate-600'>
                        {["Month", "Income", "Expenses", "Net balance"].map((heading) => (
                          <th
                            key={heading}
                            scope='col'
                            className='whitespace-nowrap px-3 py-3'
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.months.map((month) => (
                        <tr key={month.month} className='border-b border-slate-700'>
                          <th scope='row' className='whitespace-nowrap px-3 py-3'>
                            {formatMonth(month.month)}
                          </th>
                          <td className='whitespace-nowrap px-3 py-3'>
                            {formatCurrency(month.income)}
                          </td>
                          <td className='whitespace-nowrap px-3 py-3'>
                            {formatCurrency(month.expenses)}
                          </td>
                          <td className='whitespace-nowrap px-3 py-3'>
                            {formatCurrency(month.income - month.expenses)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section
                aria-labelledby='report-categories-heading'
                className='rounded-lg border border-slate-700 bg-slate-800 p-5'
              >
                <h2
                  id='report-categories-heading'
                  className='text-lg font-semibold text-white'
                >
                  Expenses by category
                </h2>
                {report.categories.length === 0 ? (
                  <p className='mt-4 text-sm text-slate-300'>No expenses in this date range.</p>
                ) : (
                  <ul className='mt-4 divide-y divide-slate-700'>
                    {report.categories.map(([category, amount]) => (
                      <li
                        key={category}
                        className='flex justify-between gap-4 py-3 text-sm text-slate-200'
                      >
                        <span className='min-w-0 break-words'>{category}</span>
                        <span className='shrink-0 font-medium text-white'>
                          {formatCurrency(amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
};

export default ReportsPage;
