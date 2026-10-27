import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

export type ApiError = {
  status: FetchBaseQueryError["status"];
  message: string;
};

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Could not communicate with the server.";
}

export function normalizeApiError(error: FetchBaseQueryError): ApiError {
  let message = "Could not communicate with the server.";
  if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") {
    message = error.error.replace(/^TypeError: /, "");
  } else if (
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "error" in error.data &&
    typeof error.data.error === "string"
  ) {
    message = error.data.error;
  }
  return { status: error.status, message };
}

const transport = fetchBaseQuery({
  baseUrl: new URL(
    import.meta.env.VITE_API_BASE_URL || "/",
    window.location.origin,
  ).href,
});

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  options,
) => {
  const result = await transport(args, api, options);
  if (result.error)
    return { error: normalizeApiError(result.error), meta: result.meta };
  return { data: result.data, meta: result.meta };
};

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Expenses", "Income"],
  keepUnusedDataFor: 60,
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  endpoints: () => ({}),
});
