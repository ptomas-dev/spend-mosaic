import {
  formatCurrency,
  formatDate,
  type Transaction,
} from "../../../domain/transactions";
import { transactionVariants, type TransactionVariant } from "../variants";

export type TransactionRowProps = {
  variant: TransactionVariant;
  transaction: Transaction;
  isBusy: boolean;
  isDeleting: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

const TransactionRow = ({
  variant,
  transaction,
  isBusy,
  isDeleting,
  onEdit,
  onDelete,
}: TransactionRowProps) => (
  <li className='grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center'>
    <div>
      <p className='font-medium text-white'>{transaction.category}</p>
      <p className='mt-1 text-sm text-slate-300'>
        {formatDate(transaction.date)}
        {transaction.memo ? ` · ${transaction.memo}` : ""}
      </p>
    </div>
    <p className='font-semibold text-white'>
      {formatCurrency(transaction.amount)}
    </p>
    <div className='flex items-center justify-self-start gap-2 sm:justify-self-end'>
      <button
        type='button'
        onClick={() => onEdit(transaction)}
        disabled={isBusy}
        aria-label={`Edit ${transaction.category}`}
        title={`Edit ${transaction.category}`}
        className={`inline-flex h-8 w-8 items-center justify-center rounded border border-slate-500 text-slate-200 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 ${transactionVariants[variant].editFocus}`}
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
          <path d='m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z' />
        </svg>
      </button>
      <button
        type='button'
        disabled={isBusy}
        onClick={() => onDelete(transaction)}
        aria-label={
          isDeleting ? `Deleting ${variant}` : `Delete ${transaction.category}`
        }
        title={`Delete ${transaction.category}`}
        aria-busy={isDeleting}
        className='inline-flex h-8 w-8 items-center justify-center rounded border border-rose-400/60 text-rose-200 transition-colors hover:bg-rose-400/10 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-wait disabled:opacity-60'
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
    </div>
  </li>
);

export default TransactionRow;
