import { describe, expect, it } from "vitest";
import { api, normalizeApiError } from "../application/api";
import { createAppStore } from "../application/store";

describe("API infrastructure", () => {
  it("registers the API reducer and middleware", () => {
    const store = createAppStore();
    store.dispatch(api.util.resetApiState());
    expect(store.getState().api.config.middlewareRegistered).toBe(true);
    expect(store.getState().api.config.keepUnusedDataFor).toBe(60);
    expect(store.getState().api.config.refetchOnFocus).toBe(false);
    store.dispatch(api.util.resetApiState());
    expect(store.getState().api.queries).toEqual({});
  });

  it("preserves server messages", () => {
    expect(
      normalizeApiError({ status: 422, data: { error: "Save rejected" } }),
    ).toEqual({
      status: 422,
      message: "Save rejected",
    });
  });

  it("normalizes network failures", () => {
    expect(
      normalizeApiError({
        status: "FETCH_ERROR",
        error: "TypeError: Failed to fetch",
      }).message,
    ).toBe("Failed to fetch");
  });

  it("provides a fallback for non-JSON server errors", () => {
    expect(
      normalizeApiError({
        status: "PARSING_ERROR",
        originalStatus: 500,
        data: "Unavailable",
        error: "Invalid JSON",
      }).message,
    ).toBe("Could not communicate with the server.");
  });
});
