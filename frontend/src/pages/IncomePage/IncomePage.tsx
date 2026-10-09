import { useEffect, useState, type FormEvent } from "react";

type Income = {
  id: number;
  date: string;
  amount: number;
  category: string;
  memo: string;
};

type IncomeForm = {
  date: string;
  amount: string;
  category: string;
  memo: string;
};

const endpoint = "/income";

const getToday = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const createInitialForm = (): IncomeForm => ({
  date: getToday(),
  amount: "",
  category: "",
  memo: "",
});

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

const IncomePage = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [form, setForm] = useState<IncomeForm>(createInitialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadIncomes = async () => {
      try {
        const response = await fetch(endpoint, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const data = (await response.json()) as Income[];
        setIncomes(data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setListError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load income.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadIncomes();

    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
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

      const createdIncome = (await response.json()) as Income;
      setIncomes((currentIncomes) => [createdIncome, ...currentIncomes]);
      setForm(createInitialForm());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save the income.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (income: Income) => {
    if (!window.confirm(`Delete the income "${income.category}"?`)) {
      return;
    }

    setDeleteError("");
    setDeletingId(income.id);

    try {
      const response = await fetch(`${endpoint}/${income.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setIncomes((currentIncomes) =>
        currentIncomes.filter(
          (currentIncome) => currentIncome.id !== income.id,
        ),
      );
    } catch (deleteError) {
      setDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the income.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const total = incomes.reduce((sum, income) => sum + Number(income.amount), 0);

  return (
    <section className='mx-auto w-full max-w-5xl space-y-8'>
      <header className='border-b border-slate-700 pb-5'>
        <p className='text-sm font-medium uppercase tracking-wide text-emerald-400'>
          INCOME
        </p>
        <h1 className='mt-2 text-3xl font-semibold text-white'>Income</h1>
        <p className='mt-2 text-sm text-slate-300'>
          Track and review your income.
        </p>
      </header>

      <section aria-labelledby='new-income-heading' className='space-y-5'>
        <div>
          <h2
            id='new-income-heading'
            className='text-xl font-semibold text-white'
          >
            New income
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
                placeholder='e.g. Salary'
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
            className='rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60'
          >
            {isSubmitting ? "Saving..." : "Add income"}
          </button>
        </form>
      </section>

      <section aria-labelledby='income-list-heading' className='space-y-4'>
        <div className='flex flex-wrap items-end justify-between gap-3 border-b border-slate-700 pb-3'>
          <div>
            <h2
              id='income-list-heading'
              className='text-xl font-semibold text-white'
            >
              Recorded income
            </h2>
            <p className='mt-1 text-sm text-slate-300'>
              {incomes.length}{" "}
              {incomes.length === 1 ? "transaction" : "transactions"}
            </p>
          </div>
          <p className='text-lg font-semibold text-white'>
            Total{" "}
            <span className='text-emerald-300'>
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
            Loading income...
          </p>
        ) : listError ? (
          <p role='alert' className='py-6 text-sm text-rose-300'>
            {listError}
          </p>
        ) : incomes.length === 0 ? (
          <p className='py-6 text-sm text-slate-300'>No income recorded yet.</p>
        ) : (
          <ul className='divide-y divide-slate-700'>
            {incomes.map((income) => (
              <li
                key={income.id}
                className='grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center'
              >
                <div>
                  <p className='font-medium text-white'>{income.category}</p>
                  <p className='mt-1 text-sm text-slate-300'>
                    {dateFormatter.format(new Date(income.date))}
                    {income.memo ? ` · ${income.memo}` : ""}
                  </p>
                </div>
                <p className='font-semibold text-white'>
                  {currencyFormatter.format(Number(income.amount))}
                </p>
                <button
                  type='button'
                  disabled={deletingId === income.id}
                  onClick={() => void handleDelete(income)}
                  aria-label={
                    deletingId === income.id
                      ? "Deleting income"
                      : `Delete ${income.category}`
                  }
                  title={`Delete ${income.category}`}
                  aria-busy={deletingId === income.id}
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

export default IncomePage;
