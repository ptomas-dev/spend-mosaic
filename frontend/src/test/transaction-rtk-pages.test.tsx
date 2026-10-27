import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { expensesApi } from "../features/expenses";
import { incomeApi } from "../features/income";
import { ExpensesPage } from "../pages/ExpensesPage";
import { IncomePage } from "../pages/IncomePage";
import { createResponseGate, createTransactionRecords, server } from "./server";
import {
  fillTransactionForm,
  getTransactionFields,
  renderWithStore,
} from "./workflows";

const original = {
  id: 41,
  date: "2026-01-15",
  amount: 12.5,
  category: "Original",
  memo: "Original note",
};
const other = { ...original, id: 42, category: "Other" };
const draft = {
  date: "2026-02-20",
  amount: "27.75",
  category: "Updated",
  memo: "Unsaved note",
};

describe.each([
  {
    name: "expenses",
    singular: "expense",
    Page: ExpensesPage,
    listEndpoint: expensesApi.endpoints.getExpenses,
  },
  {
    name: "income",
    singular: "income",
    Page: IncomePage,
    listEndpoint: incomeApi.endpoints.getIncome,
  },
])("$name RTK page coordination", ({ name, singular, Page, listEndpoint }) => {
  const url = `http://localhost/${name}`;
  const list = () =>
    within(screen.getByRole("region", { name: `Recorded ${name}` }));

  it("allows correcting the draft after repeated local validation errors", async () => {
    const create = vi.fn(() => HttpResponse.json(original));
    server.use(
      http.get(url, () => HttpResponse.json([])),
      http.post(url, create),
    );
    const user = userEvent.setup();
    renderWithStore(<Page />);
    await screen.findByText(`No ${name} recorded yet.`);
    await fillTransactionForm(user, { ...draft, category: "   " });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await user.click(screen.getByRole("button", { name: `Add ${singular}` }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Date, positive amount, and category are required",
      );
    }
    await user.clear(getTransactionFields().category);
    await user.type(getTransactionFields().category, "Corrected");
    expect(getTransactionFields().category).toHaveValue("Corrected");
    expect(create).not.toHaveBeenCalled();
  });

  it("reuses cached data on page revisits without another GET", async () => {
    const get = vi.fn(() => HttpResponse.json([original]));
    server.use(http.get(url, get));
    const view = renderWithStore(<Page />);
    await list().findByText(original.category);
    view.unmount();
    renderWithStore(<Page />, view.store);
    expect(list().getByText(original.category)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => {
      await view.store
        .dispatch(listEndpoint.initiate(undefined, { subscribe: false }))
        .unwrap();
    });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each(["create", "update", "delete"] as const)(
    "keeps rows visible and all conflicting actions blocked during %s invalidation refetch",
    async (operation) => {
      const gate = createResponseGate();
      const refetchStarted = createResponseGate();
      const records = createTransactionRecords([original, other]);
      const user = userEvent.setup();
      let gets = 0;
      const save = vi.fn(() =>
        records.save({
          ...original,
          id: operation === "create" ? 43 : original.id,
          ...draft,
          amount: 27.75,
        }),
      );
      const deletion = vi.fn(() => records.remove(other.id));
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      server.use(
        http.get(url, async () => {
          gets += 1;
          if (gets > 1) {
            refetchStarted.release();
            await gate.ready;
          }
          return records.list();
        }),
        http.post(url, save),
        http.put(`${url}/${original.id}`, save),
        http.delete(`${url}/:id`, deletion),
      );
      renderWithStore(<Page />);
      await list().findByText(original.category);
      if (operation !== "create")
        await user.click(
          screen.getByRole("button", { name: `Edit ${original.category}` }),
        );
      await fillTransactionForm(user, draft);
      try {
        await user.click(
          screen.getByRole("button", {
            name:
              operation === "delete"
                ? `Delete ${other.category}`
                : operation === "update"
                  ? "Save changes"
                  : `Add ${singular}`,
          }),
        );
        await refetchStarted.ready;
        expect(list().getByText(original.category)).toBeInTheDocument();
        expect(list().getByText(other.category)).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        await waitFor(() =>
          expect(
            screen.queryByRole("button", { name: /Saving|Deleting/ }),
          ).not.toBeInTheDocument(),
        );
        const fields = getTransactionFields();
        for (const field of Object.values(fields)) expect(field).toBeDisabled();
        const expectedCategory = operation === "delete" ? draft.category : "";
        fireEvent.change(fields.category, { target: { value: "Conflicting" } });
        expect(fields.category).toHaveValue(expectedCategory);
        const form = fields.category.closest("form");
        if (!form) throw new Error("Transaction form missing");
        fireEvent.submit(form);
        for (const button of list().getAllByRole("button")) {
          expect(button).toBeDisabled();
          fireEvent.click(button);
        }
        if (operation === "delete") {
          const cancel = screen.getByRole("button", { name: "Cancel" });
          expect(cancel).toBeDisabled();
          fireEvent.click(cancel);
          expect(fields.category).toHaveValue(draft.category);
        }
        expect(confirm).toHaveBeenCalledTimes(operation === "delete" ? 1 : 0);
        expect(save).toHaveBeenCalledTimes(operation === "delete" ? 0 : 1);
        expect(deletion).toHaveBeenCalledTimes(operation === "delete" ? 1 : 0);
      } finally {
        gate.release();
      }
      await waitFor(() =>
        expect(getTransactionFields().category).toBeEnabled(),
      );
      if (operation === "delete") {
        expect(list().queryByText(other.category)).not.toBeInTheDocument();
        expect(getTransactionFields().category).toHaveValue(draft.category);
      } else {
        expect(list().getByText(draft.category)).toBeInTheDocument();
        expect(list().getAllByRole("listitem")).toHaveLength(
          operation === "create" ? 3 : 2,
        );
      }
      expect(gets).toBe(2);
    },
  );

  it("preserves cached rows and an unrelated edit draft when deletion succeeds but refetch fails", async () => {
    const user = userEvent.setup();
    const records = createTransactionRecords([original, other]);
    let gets = 0;
    vi.spyOn(window, "confirm").mockReturnValue(true);
    server.use(
      http.get(url, () => {
        gets += 1;
        return gets === 1
          ? records.list()
          : HttpResponse.json(
              { error: "Refetch unavailable" },
              { status: 503 },
            );
      }),
      http.delete(`${url}/${other.id}`, () => records.remove(other.id)),
    );
    const view = renderWithStore(<Page />);
    await list().findByText(original.category);
    await user.click(
      screen.getByRole("button", { name: `Edit ${original.category}` }),
    );
    await fillTransactionForm(user, draft);
    await user.click(
      screen.getByRole("button", { name: `Delete ${other.category}` }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Refetch unavailable",
    );
    expect(list().getByText(original.category)).toBeInTheDocument();
    expect(list().getByText(other.category)).toBeInTheDocument();
    expect(getTransactionFields().category).toHaveValue(draft.category);
    expect(getTransactionFields().memo).toHaveValue(draft.memo);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    server.use(http.get(url, () => records.list()));
    await act(async () => {
      await view.store
        .dispatch(
          listEndpoint.initiate(undefined, {
            subscribe: false,
            forceRefetch: true,
          }),
        )
        .unwrap();
    });
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(list().queryByText(other.category)).not.toBeInTheDocument();
    expect(getTransactionFields().category).toHaveValue(draft.category);
  });

  it("recovers from an initial query error without erasing a draft", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json({ error: "List unavailable" }, { status: 503 }),
      ),
    );
    const user = userEvent.setup();
    const view = renderWithStore(<Page />);
    await screen.findByRole("alert");
    await fillTransactionForm(user, draft);
    server.use(http.get(url, () => HttpResponse.json([original])));
    await act(async () => {
      await view.store
        .dispatch(
          listEndpoint.initiate(undefined, {
            subscribe: false,
            forceRefetch: true,
          }),
        )
        .unwrap();
    });
    expect(await list().findByText(original.category)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getTransactionFields().category).toHaveValue(draft.category);
    expect(getTransactionFields().memo).toHaveValue(draft.memo);
  });

  it("deduplicates a delayed GET across remounts and blocks mutations until it settles", async () => {
    const gate = createResponseGate();
    const started = createResponseGate();
    const get = vi.fn(async () => {
      started.release();
      await gate.ready;
      return HttpResponse.json([original]);
    });
    const create = vi.fn(() => HttpResponse.json({ ...original, id: 43 }));
    server.use(http.get(url, get), http.post(url, create));
    const view = renderWithStore(<Page />);
    try {
      await started.ready;
      view.unmount();
      renderWithStore(<Page />, view.store);
      expect(screen.getByRole("status")).toHaveTextContent(
        `Loading ${name}...`,
      );
      const fields = getTransactionFields();
      expect(fields.category).toBeDisabled();
      const form = fields.category.closest("form");
      if (!form) throw new Error("Transaction form missing");
      fireEvent.submit(form);
      expect(create).not.toHaveBeenCalled();
    } finally {
      gate.release();
    }
    await list().findByText(original.category);
    expect(get).toHaveBeenCalledTimes(1);
    expect(getTransactionFields().category).toBeEnabled();
  });
});
