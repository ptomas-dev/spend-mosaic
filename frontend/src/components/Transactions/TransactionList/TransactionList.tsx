import { formatCurrency, type Transaction } from "../../../domain/transactions";
import { TransactionRow } from "../TransactionRow";
import { transactionVariants, type TransactionVariant } from "../variants";

export type TransactionListProps = {
  variant: TransactionVariant;
  transactions: readonly Transaction[];
  isLoading: boolean;
  isBusy: boolean;
  deletingId: number | null;
  listError: string;
  deleteError: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

const TransactionList = ({
  variant,
  transactions,
  isLoading,
  isBusy,
  deletingId,
  listError,
  deleteError,
  onEdit,
  onDelete,
}: TransactionListProps) => {
  const styles = transactionVariants[variant];
  const headingId = `${variant}-list-heading`;
  const total = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  return (
    <section aria-labelledby={headingId} className='space-y-4'>
      <div className='flex flex-wrap items-end justify-between gap-3 border-b border-slate-700 pb-3'>
        <div>
          <h2 id={headingId} className='text-xl font-semibold text-white'>
            Recorded {styles.plural}
          </h2>
          <p className='mt-1 text-sm text-slate-300'>
            {transactions.length}{" "}
            {transactions.length === 1 ? "transaction" : "transactions"}
          </p>
        </div>
        <p className='text-lg font-semibold text-white'>
          Total <span className={styles.total}>{formatCurrency(total)}</span>
        </p>
      </div>
      {deleteError && (
        <p role='alert' className='text-sm text-rose-300'>
          {deleteError}
        </p>
      )}
      {isLoading ? (
        <p role='status' className='py-6 text-sm text-slate-300'>
          Loading {styles.plural}...
        </p>
      ) : listError ? (
        <p role='alert' className='py-6 text-sm text-rose-300'>
          {listError}
        </p>
      ) : transactions.length === 0 ? (
        <p className='py-6 text-sm text-slate-300'>
          No {styles.plural} recorded yet.
        </p>
      ) : (
        <ul className='divide-y divide-slate-700'>
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              variant={variant}
              transaction={transaction}
              isBusy={isBusy}
              isDeleting={deletingId === transaction.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default TransactionList;
