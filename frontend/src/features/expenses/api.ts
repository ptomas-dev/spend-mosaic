import { api } from "../../application/api";
import {
  normalizeTransaction,
  type Transaction,
  type TransactionPayload,
  type TransactionResponse,
} from "../../domain/transactions";

const listTag = { type: "Expenses", id: "LIST" } as const;

export const expensesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<Transaction[], void>({
      query: () => "/expenses",
      transformResponse: (response: TransactionResponse[]) =>
        response.map(normalizeTransaction),
      providesTags: [listTag],
    }),
    createExpense: builder.mutation<Transaction, TransactionPayload>({
      query: (body) => ({ url: "/expenses", method: "POST", body }),
      transformResponse: normalizeTransaction,
      invalidatesTags: (_result, error) => (error ? [] : [listTag]),
    }),
    updateExpense: builder.mutation<
      Transaction,
      { id: number; payload: TransactionPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/expenses/${id}`,
        method: "PUT",
        body: payload,
      }),
      transformResponse: normalizeTransaction,
      invalidatesTags: (_result, error) => (error ? [] : [listTag]),
    }),
    deleteExpense: builder.mutation<void, number>({
      query: (id) => ({ url: `/expenses/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, error) => (error ? [] : [listTag]),
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} = expensesApi;
