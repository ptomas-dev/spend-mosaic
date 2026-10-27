import type { Request, Response } from "express";

interface TransactionBody {
  date?: string | null;
  amount?: number | string | null;
  category?: string | null;
  memo?: string | null;
}

export type TransactionRequest = Request<
  { id?: string },
  unknown,
  TransactionBody
>;
export type TransactionResponse = Response<unknown>;
