import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ExpensesPage } from "../pages/ExpensesPage";
import { IncomePage } from "../pages/IncomePage";
import { createResponseGate, createTransactionRecords, server } from "./server";
import {
  fillTransactionForm,
  getTransactionFields,
  renderTransactionPage,
  type TransactionDraft,
} from "./workflows";

const original = {
  id: 41,
  date: "2026-01-15",
  amount: 12.5,
  category: "Original",
  memo: "Original note",
};

const draft: TransactionDraft = {
  date: "2026-02-20",
  amount: "27.75",
  category: "Updated category",
  memo: "Updated note",
};

function expectDraft(expected: TransactionDraft) {
  const fields = getTransactionFields();
  expect(fields.date).toHaveValue(expected.date);
  expect(fields.amount).toHaveValue(Number(expected.amount));
  expect(fields.category).toHaveValue(expected.category);
  expect(fields.memo).toHaveValue(expected.memo);
}

function expectResetForm() {
  const fields = getTransactionFields();
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  expect(fields.date).toHaveValue(today.toISOString().slice(0, 10));
  expect(fields.amount).toHaveValue(null);
  expect(fields.category).toHaveValue("");
  expect(fields.memo).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "Cancel" }),
  ).not.toBeInTheDocument();
}

describe.each([
  {
    name: "ExpensesPage",
    Page: ExpensesPage,
    endpoint: "/expenses",
    singular: "expense",
    plural: "expenses",
  },
  {
    name: "IncomePage",
    Page: IncomePage,
    endpoint: "/income",
    singular: "income",
    plural: "income",
  },
])("$name", ({ Page, endpoint, singular, plural }) => {
  const url = `http://localhost${endpoint}`;
  const emptyMessage = `No ${plural} recorded yet.`;
  const list = () =>
    within(screen.getByRole("region", { name: `Recorded ${plural}` }));
  let state: ReturnType<typeof createTransactionRecords>;

  async function renderLoaded(records = [] as (typeof original)[]) {
    state = createTransactionRecords(records);
    server.use(http.get(url, () => state.list()));
    const user = renderTransactionPage(Page);
    await screen.findByText(
      records.length ? records[0].category : emptyMessage,
    );
    return user;
  }

  it("shows loading until the list response arrives", async () => {
    const gate = createResponseGate();
    server.use(
      http.get(url, async () => {
        await gate.ready;
        return HttpResponse.json([]);
      }),
    );

    renderTransactionPage(Page);
    try {
      expect(screen.getByRole("status")).toHaveTextContent(
        `Loading ${plural}...`,
      );
      expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
    } finally {
      gate.release();
    }

    expect(await screen.findByText(emptyMessage)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an empty list with zero transactions and total", async () => {
    await renderLoaded();
    expect(list().getByText(emptyMessage)).toBeInTheDocument();
    expect(list().getByText("0 transactions")).toBeInTheDocument();
    expect(list().getByText("Total", { exact: false })).toHaveTextContent(
      "Total \u20ac0.00",
    );
    expect(list().queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Add ${singular}` }),
    ).toBeEnabled();
  });

  it.each([
    {
      name: "server error",
      response: () =>
        HttpResponse.json({ error: "List unavailable" }, { status: 503 }),
      message: "List unavailable",
    },
    {
      name: "non-JSON error",
      response: () => HttpResponse.text("Unavailable", { status: 500 }),
      message: "Could not communicate with the server.",
    },
    {
      name: "network error",
      response: () => HttpResponse.error(),
      message: "Failed to fetch",
    },
  ])(
    "shows a list $name instead of an empty state",
    async ({ response, message }) => {
      server.use(http.get(url, response));
      renderTransactionPage(Page);
      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
    },
  );

  it("creates a record, shows saving, updates totals and resets the form", async () => {
    const gate = createResponseGate();
    const payloads: unknown[] = [];
    server.use(
      http.post(url, async ({ request }) => {
        payloads.push(await request.json());
        await gate.ready;
        return state.save({ id: 42, ...draft, amount: 27.75 });
      }),
    );
    const user = await renderLoaded([original]);
    await fillTransactionForm(user, draft);
    try {
      await user.click(screen.getByRole("button", { name: `Add ${singular}` }));
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
      expectDraft(draft);
    } finally {
      gate.release();
    }

    expect(await list().findByText(draft.category)).toBeInTheDocument();
    expect(payloads).toEqual([{ ...draft, amount: 27.75 }]);
    expect(list().getAllByRole("listitem")).toHaveLength(2);
    expect(list().getByText(draft.memo, { exact: false })).toBeInTheDocument();
    expect(list().getByText("2 transactions")).toBeInTheDocument();
    expect(list().getByText("Total", { exact: false })).toHaveTextContent(
      "\u20ac40.25",
    );
    expectResetForm();
    expect(
      screen.getByRole("heading", { name: `New ${singular}` }),
    ).toBeInTheDocument();
  });

  it("edits a record, shows saving changes and replaces the row", async () => {
    const gate = createResponseGate();
    const payloads: unknown[] = [];
    server.use(
      http.put(`${url}/${original.id}`, async ({ request }) => {
        payloads.push(await request.json());
        await gate.ready;
        return state.save({ ...original, ...draft, amount: 27.75 });
      }),
    );
    const user = await renderLoaded([original]);
    await user.click(
      screen.getByRole("button", { name: `Edit ${original.category}` }),
    );
    expect(
      screen.getByRole("heading", { name: `Edit ${singular}` }),
    ).toBeInTheDocument();
    expectDraft({ ...original, amount: String(original.amount) });
    await fillTransactionForm(user, draft);
    try {
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(
        screen.getByRole("button", { name: "Saving changes..." }),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    } finally {
      gate.release();
    }

    expect(await list().findByText(draft.category)).toBeInTheDocument();
    expect(payloads).toEqual([{ ...draft, amount: 27.75 }]);
    expect(list().queryByText(original.category)).not.toBeInTheDocument();
    expect(list().getAllByRole("listitem")).toHaveLength(1);
    expect(list().getByText("1 transaction")).toBeInTheDocument();
    expect(list().getByText("Total", { exact: false })).toHaveTextContent(
      "\u20ac27.75",
    );
    expectResetForm();
  });

  it("cancels an edit without mutating the recorded row", async () => {
    const mutation = vi.fn(() => HttpResponse.json(original));
    server.use(http.put(`${url}/${original.id}`, mutation));
    const user = await renderLoaded([original]);
    await user.click(
      screen.getByRole("button", { name: `Edit ${original.category}` }),
    );
    await fillTransactionForm(user, draft);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expectResetForm();
    expect(
      screen.getByRole("heading", { name: `New ${singular}` }),
    ).toBeInTheDocument();
    expect(list().getByText(original.category)).toBeInTheDocument();
    expect(list().getByText("Total", { exact: false })).toHaveTextContent(
      "\u20ac12.50",
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it.each(["create", "edit"] as const)(
    "retains the draft after a failed %s and permits retry",
    async (operation) => {
      const editing = operation === "edit";
      const mutationUrl = editing ? `${url}/${original.id}` : url;
      const method = editing ? http.put : http.post;
      server.use(
        method(mutationUrl, () =>
          HttpResponse.json({ error: "Save rejected" }, { status: 422 }),
        ),
      );
      const user = await renderLoaded([original]);
      if (editing) {
        await user.click(
          screen.getByRole("button", { name: `Edit ${original.category}` }),
        );
      }
      await fillTransactionForm(user, draft);
      const submitName = editing ? "Save changes" : `Add ${singular}`;
      await user.click(screen.getByRole("button", { name: submitName }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Save rejected",
      );
      expectDraft(draft);
      expect(screen.getByRole("button", { name: submitName })).toBeEnabled();
      expect(
        screen.getByRole("heading", {
          name: `${editing ? "Edit" : "New"} ${singular}`,
        }),
      ).toBeInTheDocument();
      expect(list().getByText(original.category)).toBeInTheDocument();
      expect(list().getByText("Total", { exact: false })).toHaveTextContent(
        "\u20ac12.50",
      );

      server.use(
        method(mutationUrl, () =>
          state.save({
            ...original,
            id: editing ? original.id : 42,
            ...draft,
            amount: 27.75,
          }),
        ),
      );
      await user.click(screen.getByRole("button", { name: submitName }));
      expect(await list().findByText(draft.category)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expectResetForm();
    },
  );

  it("clears a failed edit draft and error on cancel", async () => {
    server.use(
      http.put(`${url}/${original.id}`, () =>
        HttpResponse.json({ error: "Save rejected" }, { status: 422 }),
      ),
    );
    const user = await renderLoaded([original]);
    await user.click(
      screen.getByRole("button", { name: `Edit ${original.category}` }),
    );
    await fillTransactionForm(user, draft);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expectResetForm();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(list().getByText(original.category)).toBeInTheDocument();
  });

  it("declines deletion without making a request", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const mutation = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.delete(`${url}/${original.id}`, mutation));
    const user = await renderLoaded([original]);
    await user.click(
      screen.getByRole("button", { name: `Delete ${original.category}` }),
    );

    expect(confirm).toHaveBeenCalledWith(
      `Delete the ${singular} "${original.category}"?`,
    );
    expect(mutation).not.toHaveBeenCalled();
    expect(list().getByText(original.category)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Delete ${original.category}` }),
    ).toBeEnabled();
  });

  it("deletes the edited record, shows pending state and resets the form", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const gate = createResponseGate();
    server.use(
      http.delete(`${url}/${original.id}`, async () => {
        await gate.ready;
        return state.remove(original.id);
      }),
    );
    const user = await renderLoaded([original]);
    await user.click(
      screen.getByRole("button", { name: `Edit ${original.category}` }),
    );
    await fillTransactionForm(user, draft);
    try {
      await user.click(
        screen.getByRole("button", { name: `Delete ${original.category}` }),
      );
      const deleting = screen.getByRole("button", {
        name: `Deleting ${singular}`,
      });
      expect(deleting).toBeDisabled();
      expect(deleting).toHaveAttribute("aria-busy", "true");
    } finally {
      gate.release();
    }

    expect(await screen.findByText(emptyMessage)).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith(
      `Delete the ${singular} "${original.category}"?`,
    );
    expect(list().queryByText(original.category)).not.toBeInTheDocument();
    expect(list().getByText("0 transactions")).toBeInTheDocument();
    expect(list().getByText("Total", { exact: false })).toHaveTextContent(
      "\u20ac0.00",
    );
    expectResetForm();
  });

  it("retains the row and edit draft after failed deletion and permits retry", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    server.use(
      http.delete(`${url}/${original.id}`, () =>
        HttpResponse.json({ error: "Delete rejected" }, { status: 500 }),
      ),
    );
    const user = await renderLoaded([original]);
    await user.click(
      screen.getByRole("button", { name: `Edit ${original.category}` }),
    );
    await fillTransactionForm(user, draft);
    await user.click(
      screen.getByRole("button", { name: `Delete ${original.category}` }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Delete rejected",
    );
    expectDraft(draft);
    expect(
      screen.getByRole("heading", { name: `Edit ${singular}` }),
    ).toBeInTheDocument();
    expect(list().getByText(original.category)).toBeInTheDocument();
    expect(list().getByText("Total", { exact: false })).toHaveTextContent(
      "\u20ac12.50",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: `Delete ${original.category}` }),
      ).toBeEnabled(),
    );

    server.use(
      http.delete(`${url}/${original.id}`, () => state.remove(original.id)),
    );
    await user.click(
      screen.getByRole("button", { name: `Delete ${original.category}` }),
    );
    expect(await screen.findByText(emptyMessage)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expectResetForm();
  });
});
