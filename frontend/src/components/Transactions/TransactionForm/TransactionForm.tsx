import type { FormEvent, Ref } from "react";
import type { TransactionDraft } from "../../../domain/transactions";
import { transactionVariants, type TransactionVariant } from "../variants";

export type TransactionFormProps = {
  variant: TransactionVariant;
  draft: TransactionDraft;
  isEditing: boolean;
  isBusy: boolean;
  isSubmitting: boolean;
  error: string;
  headingRef?: Ref<HTMLHeadingElement>;
  onChange: (field: keyof TransactionDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const TransactionForm = ({
  variant,
  draft,
  isEditing,
  isBusy,
  isSubmitting,
  error,
  headingRef,
  onChange,
  onSubmit,
  onCancel,
}: TransactionFormProps) => {
  const styles = transactionVariants[variant];
  const headingId = `${variant}-form-heading`;
  const inputClassName = `w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 ${styles.fieldFocus}`;
  const submitLabel = isSubmitting
    ? isEditing
      ? "Saving changes..."
      : "Saving..."
    : isEditing
      ? "Save changes"
      : `Add ${variant}`;

  return (
    <section aria-labelledby={headingId} className='space-y-5'>
      <div>
        <h2
          ref={headingRef}
          id={headingId}
          className='text-xl font-semibold text-white'
        >
          {isEditing ? `Edit ${variant}` : `New ${variant}`}
        </h2>
        <p className='mt-1 text-sm text-slate-300'>
          Fields marked as required must be completed.
        </p>
      </div>
      <form onSubmit={onSubmit} className='space-y-4'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <label className='space-y-1.5 text-sm text-slate-200'>
            <span>Date</span>
            <input
              required
              type='date'
              value={draft.date}
              disabled={isBusy}
              onChange={(event) => onChange("date", event.target.value)}
              className={`w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white ${styles.fieldFocus}`}
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
              value={draft.amount}
              disabled={isBusy}
              onChange={(event) => onChange("amount", event.target.value)}
              placeholder='0.00'
              className={inputClassName}
            />
          </label>
          <label className='space-y-1.5 text-sm text-slate-200'>
            <span>Category *</span>
            <input
              required
              maxLength={255}
              value={draft.category}
              disabled={isBusy}
              onChange={(event) => onChange("category", event.target.value)}
              placeholder={styles.categoryPlaceholder}
              className={inputClassName}
            />
          </label>
          <label className='space-y-1.5 text-sm text-slate-200'>
            <span>
              Note <span className='text-slate-400'>(optional)</span>
            </span>
            <input
              maxLength={255}
              value={draft.memo}
              disabled={isBusy}
              onChange={(event) => onChange("memo", event.target.value)}
              placeholder='Additional details'
              className={inputClassName}
            />
          </label>
        </div>
        {error && (
          <p role='alert' className='text-sm text-rose-300'>
            {error}
          </p>
        )}
        <div className='flex flex-wrap gap-3'>
          <button
            type='submit'
            disabled={isBusy}
            className={`rounded px-4 py-2 text-sm font-semibold text-slate-950 transition-colors disabled:cursor-wait disabled:opacity-60 ${styles.submit}`}
          >
            {submitLabel}
          </button>
          {isEditing && (
            <button
              type='button'
              onClick={onCancel}
              disabled={isBusy}
              className='rounded border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-60'
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
};

export default TransactionForm;
