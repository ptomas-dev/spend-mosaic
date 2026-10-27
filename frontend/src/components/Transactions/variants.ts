export type TransactionVariant = "expense" | "income";

export const transactionVariants = {
  expense: {
    plural: "expenses",
    categoryPlaceholder: "e.g. Groceries",
    fieldFocus:
      "focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400",
    submit: "bg-rose-400 hover:bg-rose-300",
    total: "text-rose-400",
    editFocus: "focus:ring-rose-300",
  },
  income: {
    plural: "income",
    categoryPlaceholder: "e.g. Salary",
    fieldFocus:
      "focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400",
    submit: "bg-emerald-500 hover:bg-emerald-400",
    total: "text-emerald-300",
    editFocus: "focus:ring-emerald-300",
  },
} satisfies Record<
  TransactionVariant,
  {
    plural: string;
    categoryPlaceholder: string;
    fieldFocus: string;
    submit: string;
    total: string;
    editFocus: string;
  }
>;
