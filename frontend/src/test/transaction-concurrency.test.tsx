import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
const other = { ...original, id: 42, category: "Other" };
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

function attemptFieldChanges() {
  const fields = getTransactionFields();
  for (const field of ["date", "amount", "category", "memo"] as const) {
    expect(fields[field]).toBeDisabled();
    fireEvent.change(fields[field], {
      target: {
        value:
          field === "date"
            ? "2026-03-01"
            : field === "amount"
              ? "99"
              : "Conflicting draft",
      },
    });
  }
}

function attemptBlockedClick(button: HTMLElement) {
  expect(button).toBeDisabled();
  fireEvent.click(button);
}

function submitForm() {
  const form = getTransactionFields().category.closest("form");
  if (!form) throw new Error("Transaction form missing");
  fireEvent.submit(form);
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
])("$name concurrency", ({ Page, endpoint, singular, plural }) => {
  const url = `http://localhost${endpoint}`;
  const list = () =>
    within(screen.getByRole("region", { name: `Recorded ${plural}` }));
  let records: ReturnType<typeof createTransactionRecords>;

  async function renderLoaded() {
    records = createTransactionRecords([original, other]);
    server.use(http.get(url, () => records.list()));
    const user = renderTransactionPage(Page);
    await list().findByText(original.category);
    return user;
  }

  it.each(["create", "edit"] as const)(
    "does not replace the draft by starting another edit during a pending %s",
    async (operation) => {
      const editing = operation === "edit";
      const gate = createResponseGate();
      const started = createResponseGate();
      server.use(
        (editing ? http.put : http.post)(
          editing ? `${url}/${original.id}` : url,
          async () => {
            started.release();
            await gate.ready;
            return records.save({
              ...original,
              id: editing ? original.id : 43,
              ...draft,
              amount: 27.75,
            });
          },
        ),
      );
      const user = await renderLoaded();
      if (editing)
        await user.click(
          screen.getByRole("button", { name: `Edit ${original.category}` }),
        );
      await fillTransactionForm(user, draft);
      try {
        await user.click(
          screen.getByRole("button", {
            name: editing ? "Save changes" : `Add ${singular}`,
          }),
        );
        await started.ready;
        await user.click(
          screen.getByRole("button", { name: `Edit ${other.category}` }),
        );
        expectDraft(draft);
      } finally {
        gate.release();
      }
      await list().findByText(draft.category);
      expect(list().getByText(other.category)).toBeInTheDocument();
      expect(getTransactionFields().category).toHaveValue("");
    },
  );

  it.each(["create", "edit"] as const)(
    "blocks field changes, edit, cancel, delete and duplicate submit during pending %s",
    async (operation) => {
      const editing = operation === "edit";
      const gate = createResponseGate();
      const started = createResponseGate();
      const requests: unknown[] = [];
      const saved = {
        ...original,
        id: editing ? original.id : 43,
        ...draft,
        amount: 27.75,
      };
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      const deletion = vi.fn(() => new HttpResponse(null, { status: 204 }));
      server.use(
        (editing ? http.put : http.post)(
          editing ? `${url}/${original.id}` : url,
          async ({ request }) => {
            requests.push(await request.json());
            started.release();
            await gate.ready;
            return records.save(saved);
          },
        ),
        http.delete(`${url}/:id`, deletion),
      );
      const user = await renderLoaded();
      if (editing)
        await user.click(
          screen.getByRole("button", { name: `Edit ${original.category}` }),
        );
      await fillTransactionForm(user, draft);
      try {
        await user.click(
          screen.getByRole("button", {
            name: editing ? "Save changes" : `Add ${singular}`,
          }),
        );
        await started.ready;
        expect(
          screen.getByRole("button", {
            name: editing ? "Saving changes..." : "Saving...",
          }),
        ).toBeDisabled();
        attemptFieldChanges();
        attemptBlockedClick(
          screen.getByRole("button", { name: `Edit ${other.category}` }),
        );
        if (editing)
          attemptBlockedClick(screen.getByRole("button", { name: "Cancel" }));
        for (const record of [original, other]) {
          attemptBlockedClick(
            screen.getByRole("button", { name: `Delete ${record.category}` }),
          );
        }
        submitForm();
        expectDraft(draft);
        expect(
          screen.getByRole("heading", {
            name: `${editing ? "Edit" : "New"} ${singular}`,
          }),
        ).toBeInTheDocument();
        expect(confirm).not.toHaveBeenCalled();
      } finally {
        gate.release();
      }

      expect(await list().findByText(draft.category)).toBeInTheDocument();
      expect(requests).toEqual([{ ...draft, amount: 27.75 }]);
      expect(deletion).not.toHaveBeenCalled();
      expect(list().getByText(other.category)).toBeInTheDocument();
      expect(list().getAllByRole("listitem")).toHaveLength(editing ? 2 : 3);
      expect(getTransactionFields().category).toHaveValue("");
      await user.click(
        screen.getByRole("button", { name: `Edit ${other.category}` }),
      );
      expectDraft({ ...other, amount: String(other.amount) });
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(getTransactionFields().category).toHaveValue("");
    },
  );

  it.each(["edited", "other"] as const)(
    "blocks edit, save, cancel, field changes and other deletes while deleting the %s row",
    async (target) => {
      const deleted = target === "edited" ? original : other;
      const retained = target === "edited" ? other : original;
      const gate = createResponseGate();
      const started = createResponseGate();
      const deletedIds: string[] = [];
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      const save = vi.fn(() => HttpResponse.json(original));
      server.use(
        http.delete(`${url}/:id`, async ({ params }) => {
          deletedIds.push(String(params.id));
          started.release();
          await gate.ready;
          return records.remove(Number(params.id));
        }),
        http.put(`${url}/:id`, save),
        http.post(url, save),
      );
      const user = await renderLoaded();
      await user.click(
        screen.getByRole("button", { name: `Edit ${original.category}` }),
      );
      await fillTransactionForm(user, draft);
      try {
        await user.click(
          screen.getByRole("button", { name: `Delete ${deleted.category}` }),
        );
        await started.ready;
        const pending = screen.getByRole("button", {
          name: `Deleting ${singular}`,
        });
        expect(pending).toBeDisabled();
        expect(pending).toHaveAttribute("aria-busy", "true");
        attemptFieldChanges();
        attemptBlockedClick(
          screen.getByRole("button", { name: "Save changes" }),
        );
        submitForm();
        attemptBlockedClick(screen.getByRole("button", { name: "Cancel" }));
        for (const record of [original, other]) {
          attemptBlockedClick(
            screen.getByRole("button", { name: `Edit ${record.category}` }),
          );
        }
        attemptBlockedClick(pending);
        attemptBlockedClick(
          screen.getByRole("button", { name: `Delete ${retained.category}` }),
        );
        expectDraft(draft);
        expect(
          screen.getAllByRole("button", { name: `Deleting ${singular}` }),
        ).toHaveLength(1);
        expect(pending).toHaveAttribute("aria-busy", "true");
        expect(confirm).toHaveBeenCalledTimes(1);
      } finally {
        gate.release();
      }

      await waitFor(() =>
        expect(list().queryByText(deleted.category)).not.toBeInTheDocument(),
      );
      expect(deletedIds).toEqual([String(deleted.id)]);
      expect(save).not.toHaveBeenCalled();
      expect(list().getByText(retained.category)).toBeInTheDocument();
      expect(list().getAllByRole("listitem")).toHaveLength(1);
      expect(
        screen.queryByRole("button", { name: `Deleting ${singular}` }),
      ).not.toBeInTheDocument();
      if (target === "other") {
        expectDraft(draft);
        expect(
          screen.getByRole("button", { name: "Save changes" }),
        ).toBeEnabled();
      } else {
        expect(getTransactionFields().category).toHaveValue("");
        expect(
          screen.getByRole("button", { name: `Add ${singular}` }),
        ).toBeEnabled();
      }
      expect(
        screen.getByRole("button", { name: `Delete ${retained.category}` }),
      ).toBeEnabled();
    },
  );

  it("blocks fields and mutations until the initial GET finishes, then retains a new record", async () => {
    const gate = createResponseGate();
    const started = createResponseGate();
    const initialRecords = createTransactionRecords([original, other]);
    const create = vi.fn(() =>
      initialRecords.save({ id: 43, ...draft, amount: 27.75 }),
    );
    server.use(
      http.get(url, async () => {
        started.release();
        await gate.ready;
        return initialRecords.list();
      }),
      http.post(url, create),
    );
    const user = renderTransactionPage(Page);
    const fields = getTransactionFields();
    const initialDate = (fields.date as HTMLInputElement).value;
    try {
      await started.ready;
      expect(screen.getByRole("status")).toHaveTextContent(
        `Loading ${plural}...`,
      );
      attemptFieldChanges();
      attemptBlockedClick(
        screen.getByRole("button", { name: `Add ${singular}` }),
      );
      submitForm();
      expect(fields.date).toHaveValue(initialDate);
      expect(fields.amount).toHaveValue(null);
      expect(fields.category).toHaveValue("");
      expect(fields.memo).toHaveValue("");
    } finally {
      gate.release();
    }

    await list().findByText(original.category);
    expect(create).not.toHaveBeenCalled();
    for (const field of Object.values(fields)) expect(field).toBeEnabled();
    await fillTransactionForm(user, draft);
    await user.click(screen.getByRole("button", { name: `Add ${singular}` }));
    expect(await list().findByText(draft.category)).toBeInTheDocument();
    expect(create).toHaveBeenCalledTimes(1);
    expect(list().getAllByRole("listitem")).toHaveLength(3);
    expect(list().getByText(original.category)).toBeInTheDocument();
    expect(list().getByText(other.category)).toBeInTheDocument();
  });
});
