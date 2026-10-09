import { useEffect, useState, type FormEvent } from "react";

type Expense = {
  id: number;
  date: string;
  amount: number;
  category: string;
  memo: string;
};

type ExpenseForm = {
  date: string;
  amount: string;
  category: string;
  memo: string;
};

const getToday = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const initialForm: ExpenseForm = {
  date: getToday(),
  amount: "",
  category: "",
  memo: "",
};

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

const getErrorMessage = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return body?.error ?? "Could not communicate with the server.";
};

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<ExpenseForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadExpenses = async () => {
      try {
        const response = await fetch("/expenses", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const data = (await response.json()) as Expense[];
        setExpenses(data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setListError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load expenses.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadExpenses();

    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const createdExpense = (await response.json()) as Expense;
      setExpenses((currentExpenses) => [createdExpense, ...currentExpenses]);
      setForm({ ...initialForm, date: getToday() });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save the expense.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Delete the expense "${expense.category}"?`)) {
      return;
    }

    setDeleteError("");
    setDeletingId(expense.id);

    try {
      const response = await fetch(`/expenses/${expense.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setExpenses((currentExpenses) =>
        currentExpenses.filter(
          (currentExpense) => currentExpense.id !== expense.id,
        ),
      );
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the expense.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  return (
    <section className='mx-auto w-full max-w-5xl space-y-8'>
      <header className='border-b border-slate-700 pb-5'>
        <p className='text-sm font-medium uppercase tracking-wide text-rose-400'>
          EXPENSES
        </p>
        <h1 className='mt-2 text-3xl font-semibold text-white'>Expenses</h1>
        <p className='mt-2 text-sm text-slate-300'>
          Track and review your expenses.
        </p>
      </header>

      <section aria-labelledby='new-expense-heading' className='space-y-5'>
        <div>
          <h2
            id='new-expense-heading'
            className='text-xl font-semibold text-white'
          >
            New expense
          </h2>
          <p className='mt-1 text-sm text-slate-300'>
            Fields marked as required must be completed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='space-y-1.5 text-sm text-slate-200'>
              <span>Date</span>
              <input
                required
                type='date'
                value={form.date}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    date: event.target.value,
                  }))
                }
                className='w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400'
              />
            </label>

            <label className='space-y-1.5 text-sm text-slate-200'>
              <span>Amount (€) *</span>
              <input
                required
                min='0.01'
                step='0.01'
                type='number'
                inputMode='decimal'
                value={form.amount}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    amount: event.target.value,
                  }))
                }
                placeholder='0.00'
                className='w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400'
              />
            </label>

            <label className='space-y-1.5 text-sm text-slate-200'>
              <span>Category *</span>
              <input
                required
                maxLength={255}
                value={form.category}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    category: event.target.value,
                  }))
                }
                placeholder='e.g. Groceries'
                className='w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400'
              />
            </label>

            <label className='space-y-1.5 text-sm text-slate-200'>
              <span>
                Note <span className='text-slate-400'>(optional)</span>
              </span>
              <input
                maxLength={255}
                value={form.memo}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    memo: event.target.value,
                  }))
                }
                placeholder='Additional details'
                className='w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400'
              />
            </label>
          </div>

          {error && (
            <p role='alert' className='text-sm text-rose-300'>
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={isSubmitting}
            className='rounded bg-rose-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-rose-300 disabled:cursor-wait disabled:opacity-60'
          >
            {isSubmitting ? "Saving..." : "Add expense"}
          </button>
        </form>
      </section>

      <section aria-labelledby='expense-list-heading' className='space-y-4'>
        <div className='flex flex-wrap items-end justify-between gap-3 border-b border-slate-700 pb-3'>
          <div>
            <h2
              id='expense-list-heading'
              className='text-xl font-semibold text-white'
            >
              Recorded expenses
            </h2>
            <p className='mt-1 text-sm text-slate-300'>
              {expenses.length}{" "}
              {expenses.length === 1 ? "transaction" : "transactions"}
            </p>
          </div>
          <p className='text-lg font-semibold text-white'>
            Total{" "}
            <span className='text-rose-400'>
              {currencyFormatter.format(total)}
            </span>
          </p>
        </div>

        {deleteError && (
          <p role='alert' className='text-sm text-rose-300'>
            {deleteError}
          </p>
        )}

        {isLoading ? (
          <p role='status' className='py-6 text-sm text-slate-300'>
            Loading expenses...
          </p>
        ) : listError ? (
          <p role='alert' className='py-6 text-sm text-rose-300'>
            {listError}
          </p>
        ) : expenses.length === 0 ? (
          <p className='py-6 text-sm text-slate-300'>
            No expenses recorded yet.
          </p>
        ) : (
          <ul className='divide-y divide-slate-700'>
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className='grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center'
              >
                <div>
                  <p className='font-medium text-white'>{expense.category}</p>
                  <p className='mt-1 text-sm text-slate-300'>
                    {dateFormatter.format(new Date(expense.date))}
                    {expense.memo ? ` · ${expense.memo}` : ""}
                  </p>
                </div>
                <p className='font-semibold text-white'>
                  {currencyFormatter.format(Number(expense.amount))}
                </p>
                <button
                  type='button'
                  disabled={deletingId === expense.id}
                  onClick={() => void handleDelete(expense)}
                  aria-label={
                    deletingId === expense.id
                      ? "Deleting expense"
                      : `Delete ${expense.category}`
                  }
                  title={`Delete ${expense.category}`}
                  aria-busy={deletingId === expense.id}
                  className='inline-flex h-8 w-8 items-center justify-center justify-self-start rounded border border-rose-400/60 text-rose-200 transition-colors hover:bg-rose-400/10 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-wait disabled:opacity-60 sm:justify-self-end'
                >
                  <svg
                    aria-hidden='true'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.75'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='h-4 w-4'
                  >
                    <path d='M3 6h18' />
                    <path d='M8 6V4h8v2' />
                    <path d='m19 6-1 14H6L5 6' />
                    <path d='M10 11v5M14 11v5' />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};

export default ExpensesPage;
