export type TransactionResponse = {
  id: number;
  date: string;
  amount: number;
  category: string;
  memo?: string | null;
};

export type Transaction = {
  id: number;
  date: string;
  amount: number;
  category: string;
  memo: string;
};

export type TransactionDraft = {
  date: string;
  amount: string;
  category: string;
  memo: string;
};

export type TransactionPayload = {
  date: string;
  amount: number;
  category: string;
  memo: string;
};
