import type {
  Transaction,
  TransactionDraft,
  TransactionPayload,
  TransactionResponse,
} from "./types";

export function normalizeTransaction(
  response: TransactionResponse,
): Transaction {
  if (!Number.isFinite(response.amount)) {
    throw new Error("Transaction amount must be finite.");
  }

  return {
    id: response.id,
    date: response.date,
    amount: response.amount,
    category: response.category,
    memo: response.memo ?? "",
  };
}

export function createTransactionDraft(): TransactionDraft {
  const today = new Date();
  const year = String(today.getFullYear()).padStart(4, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    amount: "",
    category: "",
    memo: "",
  };
}

export function transactionToDraft(transaction: Transaction): TransactionDraft {
  return {
    date: transaction.date.slice(0, 10),
    amount: String(transaction.amount),
    category: transaction.category,
    memo: transaction.memo,
  };
}

export function draftToPayload(draft: TransactionDraft): TransactionPayload {
  const amount = Number(draft.amount);
  const category = draft.category.trim();

  if (!draft.date || !Number.isFinite(amount) || amount <= 0 || !category) {
    throw new Error("Date, positive amount, and category are required");
  }

  return {
    date: draft.date,
    amount,
    category,
    memo: draft.memo,
  };
}
