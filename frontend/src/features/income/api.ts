import { api } from "../../application/api";
import {
  normalizeTransaction,
  type Transaction,
  type TransactionPayload,
  type TransactionResponse,
} from "../../domain/transactions";

const listTag = { type: "Income", id: "LIST" } as const;

export const incomeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getIncome: builder.query<Transaction[], void>({
      query: () => "/income",
      transformResponse: (response: TransactionResponse[]) =>
        response.map(normalizeTransaction),
      providesTags: [listTag],
    }),
    createIncome: builder.mutation<Transaction, TransactionPayload>({
      query: (body) => ({ url: "/income", method: "POST", body }),
      transformResponse: normalizeTransaction,
      invalidatesTags: (_result, error) => (error ? [] : [listTag]),
    }),
    updateIncome: builder.mutation<
      Transaction,
      { id: number; payload: TransactionPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/income/${id}`,
        method: "PUT",
        body: payload,
      }),
      transformResponse: normalizeTransaction,
      invalidatesTags: (_result, error) => (error ? [] : [listTag]),
    }),
    deleteIncome: builder.mutation<void, number>({
      query: (id) => ({ url: `/income/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, error) => (error ? [] : [listTag]),
    }),
  }),
});

export const {
  useGetIncomeQuery,
  useCreateIncomeMutation,
  useUpdateIncomeMutation,
  useDeleteIncomeMutation,
} = incomeApi;
