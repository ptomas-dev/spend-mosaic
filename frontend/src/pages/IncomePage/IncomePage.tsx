import { getApiErrorMessage } from "../../application/api";
import {
  TransactionForm,
  TransactionList,
} from "../../components/Transactions";
import { useTransactionPage } from "../../domain/transactions/page";
import {
  useCreateIncomeMutation,
  useDeleteIncomeMutation,
  useGetIncomeQuery,
  useUpdateIncomeMutation,
} from "../../features/income";

const IncomePage = () => {
  const query = useGetIncomeQuery();
  const [create, creation] = useCreateIncomeMutation();
  const [update, updating] = useUpdateIncomeMutation();
  const [remove, deletion] = useDeleteIncomeMutation();
  const isSubmitting = creation.isLoading || updating.isLoading;
  const isBusy = query.isFetching || isSubmitting || deletion.isLoading;
  const page = useTransactionPage({
    singular: "income",
    isBusy,
    save: (payload, id) =>
      id === null ? create(payload).unwrap() : update({ id, payload }).unwrap(),
    remove: (id) => remove(id).unwrap(),
  });
  const listError = query.error ? getApiErrorMessage(query.error) : "";

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

      <TransactionForm
        variant='income'
        draft={page.form}
        isEditing={page.editingId !== null}
        isBusy={isBusy}
        isSubmitting={isSubmitting}
        error={page.error}
        headingRef={page.formHeadingRef}
        onChange={page.handleFormChange}
        onSubmit={page.handleSubmit}
        onCancel={page.handleCancelEdit}
      />
      {query.data !== undefined && listError && (
        <p role='alert' className='text-sm text-rose-300'>
          {listError}
        </p>
      )}
      <TransactionList
        variant='income'
        transactions={query.data ?? []}
        isLoading={query.isLoading}
        isBusy={isBusy}
        deletingId={deletion.isLoading ? (deletion.originalArgs ?? null) : null}
        listError={query.data === undefined ? listError : ""}
        deleteError={page.deleteError}
        onEdit={page.handleEdit}
        onDelete={page.handleDelete}
      />
    </section>
  );
};

export default IncomePage;
