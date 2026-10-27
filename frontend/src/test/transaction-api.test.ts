import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { api } from "../application/api";
import { createAppStore } from "../application/store";
import { expensesApi } from "../features/expenses";
import { incomeApi } from "../features/income";
import { createResponseGate, createTransactionRecords, server } from "./server";
import { createTestStore } from "./workflows";

it("normalizes responses and invalidates only the successful mutation's resource", async () => {
  const store = createAppStore();
  const original = {
    id: 1,
    date: "2026-01-15",
    amount: 12,
    category: "Original",
    memo: null,
  };
  const payload = {
    date: original.date,
    amount: 20,
    category: "Created",
    memo: "",
  };
  let expenses = [original];
  let expenseGets = 0;
  let incomeGets = 0;
  server.use(
    http.get("http://localhost/expenses", () => {
      expenseGets += 1;
      return HttpResponse.json(expenses);
    }),
    http.get("http://localhost/income", () => {
      incomeGets += 1;
      return HttpResponse.json([original]);
    }),
    http.post("http://localhost/expenses", () => {
      const saved = { id: 2, ...payload, memo: null };
      expenses = [saved, ...expenses];
      return HttpResponse.json(saved, { status: 201 });
    }),
  );
  const expenseQuery = store.dispatch(
    expensesApi.endpoints.getExpenses.initiate(),
  );
  const incomeQuery = store.dispatch(incomeApi.endpoints.getIncome.initiate());
  try {
    expect(await expenseQuery.unwrap()).toEqual([{ ...original, memo: "" }]);
    expect(await incomeQuery.unwrap()).toEqual([{ ...original, memo: "" }]);
    expect(
      await store
        .dispatch(expensesApi.endpoints.createExpense.initiate(payload))
        .unwrap(),
    ).toEqual({ id: 2, ...payload });
    await waitFor(() =>
      expect(
        expensesApi.endpoints.getExpenses.select()(store.getState()).data,
      ).toHaveLength(2),
    );
    expect(expenseGets).toBe(2);
    expect(incomeGets).toBe(1);
  } finally {
    expenseQuery.unsubscribe();
    incomeQuery.unsubscribe();
    store.dispatch(api.util.resetApiState());
  }
});

const original = {
  id: 41,
  date: "2026-01-15",
  amount: 12.5,
  category: "Original",
  memo: "",
};
const payload = {
  date: original.date,
  amount: 27.75,
  category: "Saved",
  memo: "",
};
const resources = [
  {
    name: "expenses",
    url: "http://localhost/expenses",
    otherUrl: "http://localhost/income",
    list: expensesApi.endpoints.getExpenses,
    otherList: incomeApi.endpoints.getIncome,
    create: expensesApi.endpoints.createExpense,
    update: expensesApi.endpoints.updateExpense,
    remove: expensesApi.endpoints.deleteExpense,
  },
  {
    name: "income",
    url: "http://localhost/income",
    otherUrl: "http://localhost/expenses",
    list: incomeApi.endpoints.getIncome,
    otherList: expensesApi.endpoints.getExpenses,
    create: incomeApi.endpoints.createIncome,
    update: incomeApi.endpoints.updateIncome,
    remove: incomeApi.endpoints.deleteIncome,
  },
];

describe.each(resources)(
  "$name RTK cache",
  ({ url, otherUrl, list, otherList, create, update, remove }) => {
    it.each(["create", "update", "delete"] as const)(
      "invalidates only its own list after successful %s",
      async (operation) => {
        const store = createTestStore();
        const records = createTransactionRecords([original]);
        const get = vi.fn(() => records.list());
        const otherGet = vi.fn(() => HttpResponse.json([original]));
        server.use(
          http.get(url, get),
          http.get(otherUrl, otherGet),
          http.post(url, () => records.save({ id: 42, ...payload })),
          http.put(`${url}/${original.id}`, () =>
            records.save({ ...original, ...payload }),
          ),
          http.delete(`${url}/${original.id}`, () =>
            records.remove(original.id),
          ),
        );
        const query = store.dispatch(list.initiate());
        const otherQuery = store.dispatch(otherList.initiate());
        await Promise.all([query.unwrap(), otherQuery.unwrap()]);
        if (operation === "create") {
          expect(
            await store.dispatch(create.initiate(payload)).unwrap(),
          ).toEqual({ id: 42, ...payload });
        } else if (operation === "update") {
          expect(
            await store
              .dispatch(update.initiate({ id: original.id, payload }))
              .unwrap(),
          ).toEqual({ ...original, ...payload });
        } else {
          await store.dispatch(remove.initiate(original.id)).unwrap();
        }
        const expected =
          operation === "delete"
            ? []
            : operation === "create"
              ? [{ id: 42, ...payload }, original]
              : [{ ...original, ...payload }];
        await waitFor(() =>
          expect(list.select()(store.getState()).data).toEqual(expected),
        );
        expect(get).toHaveBeenCalledTimes(2);
        expect(otherGet).toHaveBeenCalledTimes(1);
        query.unsubscribe();
        otherQuery.unsubscribe();
      },
    );

    it.each(["create", "update", "delete"] as const)(
      "does not invalidate either list after failed %s",
      async (operation) => {
        const store = createTestStore();
        const get = vi.fn(() => HttpResponse.json([original]));
        const otherGet = vi.fn(() => HttpResponse.json([original]));
        const reject = () =>
          HttpResponse.json({ error: "Rejected" }, { status: 422 });
        server.use(
          http.get(url, get),
          http.get(otherUrl, otherGet),
          http.post(url, reject),
          http.put(`${url}/${original.id}`, reject),
          http.delete(`${url}/${original.id}`, reject),
        );
        const query = store.dispatch(list.initiate());
        const otherQuery = store.dispatch(otherList.initiate());
        await Promise.all([query.unwrap(), otherQuery.unwrap()]);
        const mutation =
          operation === "create"
            ? store.dispatch(create.initiate(payload))
            : operation === "update"
              ? store.dispatch(update.initiate({ id: original.id, payload }))
              : store.dispatch(remove.initiate(original.id));
        await expect(mutation.unwrap()).rejects.toEqual({
          status: 422,
          message: "Rejected",
        });
        await store
          .dispatch(list.initiate(undefined, { subscribe: false }))
          .unwrap();
        expect(list.select()(store.getState()).data).toEqual([original]);
        expect(get).toHaveBeenCalledTimes(1);
        expect(otherGet).toHaveBeenCalledTimes(1);
        query.unsubscribe();
        otherQuery.unsubscribe();
      },
    );

    it("retains unused cache for 60 seconds and fetches again after expiry", async () => {
      const store = createTestStore();
      const get = vi.fn(() => HttpResponse.json([original]));
      server.use(http.get(url, get));
      const query = store.dispatch(list.initiate());
      await query.unwrap();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      try {
        query.unsubscribe();
        await vi.advanceTimersByTimeAsync(59_999);
        expect(list.select()(store.getState()).data).toEqual([original]);
        await vi.advanceTimersByTimeAsync(2);
        expect(list.select()(store.getState()).isUninitialized).toBe(true);
      } finally {
        vi.useRealTimers();
      }
      const revisit = store.dispatch(list.initiate());
      expect(await revisit.unwrap()).toEqual([original]);
      expect(get).toHaveBeenCalledTimes(2);
      revisit.unsubscribe();
    });

    it("does not refetch active cached data on focus or reconnect", async () => {
      const store = createTestStore();
      const get = vi.fn(() => HttpResponse.json([original]));
      server.use(http.get(url, get));
      const query = store.dispatch(list.initiate());
      await query.unwrap();
      store.dispatch(api.internalActions.onFocusLost());
      store.dispatch(api.internalActions.onFocus());
      store.dispatch(api.internalActions.onOffline());
      store.dispatch(api.internalActions.onOnline());
      await store
        .dispatch(list.initiate(undefined, { subscribe: false }))
        .unwrap();
      expect(get).toHaveBeenCalledTimes(1);
      query.unsubscribe();
    });

    it("refetches after a delayed stale GET completes when a mutation succeeded in flight", async () => {
      const store = createTestStore();
      const gate = createResponseGate();
      const started = createResponseGate();
      const records = createTransactionRecords([original]);
      let gets = 0;
      server.use(
        http.get(url, async () => {
          gets += 1;
          if (gets === 1) {
            const stale = records.list();
            started.release();
            await gate.ready;
            return stale;
          }
          return records.list();
        }),
        http.post(url, () => records.save({ id: 42, ...payload })),
      );
      const query = store.dispatch(list.initiate());
      try {
        await started.ready;
        await store.dispatch(create.initiate(payload)).unwrap();
        expect(gets).toBe(1);
      } finally {
        gate.release();
      }
      await query.unwrap();
      await waitFor(() =>
        expect(list.select()(store.getState()).data).toEqual([
          { id: 42, ...payload },
          original,
        ]),
      );
      expect(gets).toBe(2);
      query.unsubscribe();
    });
  },
);
