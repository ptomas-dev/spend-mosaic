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

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "medium",
});

const getErrorMessage = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return body?.error ?? "Não foi possível comunicar com o servidor.";
};

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<ExpenseForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");

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
              : "Não foi possível carregar as despesas.",
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
          : "Não foi possível guardar a despesa.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  return (
    <section className='mx-auto w-full max-w-5xl space-y-8'>
      <header className='border-b border-slate-700 pb-5'>
        <p className='text-sm font-medium uppercase tracking-wide text-emerald-400'>
          Movimentos
        </p>
        <h1 className='mt-2 text-3xl font-semibold text-white'>Despesas</h1>
        <p className='mt-2 text-sm text-slate-300'>
          Regista e consulta as tuas despesas.
        </p>
      </header>

      <section aria-labelledby='new-expense-heading' className='space-y-5'>
        <div>
          <h2
            id='new-expense-heading'
            className='text-xl font-semibold text-white'
          >
            Nova despesa
          </h2>
          <p className='mt-1 text-sm text-slate-300'>
            Os campos assinalados são obrigatórios.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='space-y-1.5 text-sm text-slate-200'>
              <span>Data</span>
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
              <span>Valor (€)</span>
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
                placeholder='0,00'
                className='w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400'
              />
            </label>

            <label className='space-y-1.5 text-sm text-slate-200'>
              <span>Categoria</span>
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
                placeholder='Ex.: Alimentação'
                className='w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400'
              />
            </label>

            <label className='space-y-1.5 text-sm text-slate-200'>
              <span>
                Nota <span className='text-slate-400'>(opcional)</span>
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
                placeholder='Detalhes adicionais'
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
            {isSubmitting ? "A guardar..." : "Adicionar despesa"}
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
              Despesas registadas
            </h2>
            <p className='mt-1 text-sm text-slate-300'>
              {expenses.length}{" "}
              {expenses.length === 1 ? "movimento" : "movimentos"}
            </p>
          </div>
          <p className='text-lg font-semibold text-white'>
            Total{" "}
            <span className='text-emerald-300'>
              {currencyFormatter.format(total)}
            </span>
          </p>
        </div>

        {isLoading ? (
          <p role='status' className='py-6 text-sm text-slate-300'>
            A carregar despesas...
          </p>
        ) : listError ? (
          <p role='alert' className='py-6 text-sm text-rose-300'>
            {listError}
          </p>
        ) : expenses.length === 0 ? (
          <p className='py-6 text-sm text-slate-300'>
            Ainda não existem despesas registadas.
          </p>
        ) : (
          <ul className='divide-y divide-slate-700'>
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className='grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center'
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};

export default ExpensesPage;
