import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  TransactionForm,
  TransactionList,
  type TransactionFormProps,
  type TransactionVariant,
} from ".";
import type { TransactionDraft } from "../../domain/transactions";
import {
  fillTransactionForm,
  getTransactionFields,
} from "../../test/workflows";

const draft: TransactionDraft = {
  date: "2026-02-20",
  amount: "27.75",
  category: "Updated category",
  memo: "Updated note",
};

const transaction = {
  id: 41,
  date: "2026-01-15",
  amount: 12.5,
  category: "Original",
  memo: "Original note",
};

function ControlledForm(props: TransactionFormProps) {
  const [value, setValue] = useState(props.draft);
  return (
    <TransactionForm
      {...props}
      draft={value}
      onChange={(field, nextValue) => {
        props.onChange(field, nextValue);
        setValue((current) => ({ ...current, [field]: nextValue }));
      }}
    />
  );
}

describe.each(["expense", "income"] as const)(
  "%s components",
  (variant: TransactionVariant) => {
    it("emits draft changes, submit and cancel, and exposes the heading ref", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onSubmit = vi.fn((event) => event.preventDefault());
      const onCancel = vi.fn();
      const headingRef = createRef<HTMLHeadingElement>();
      render(
        <ControlledForm
          variant={variant}
          draft={{ ...draft, amount: "", category: "", memo: "" }}
          isEditing
          isBusy={false}
          isSubmitting={false}
          error='Save failed'
          headingRef={headingRef}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />,
      );

      await fillTransactionForm(user, draft);
      expect(onChange).toHaveBeenCalledWith("date", draft.date);
      expect(onChange).toHaveBeenCalledWith("amount", draft.amount);
      expect(onChange).toHaveBeenCalledWith("category", draft.category);
      expect(onChange).toHaveBeenCalledWith("memo", draft.memo);
      expect(getTransactionFields().memo).toHaveValue(draft.memo);
      expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
      expect(headingRef.current).toBe(
        screen.getByRole("heading", { name: `Edit ${variant}` }),
      );

      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(onSubmit).toHaveBeenCalledOnce();
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it("preserves the controlled draft and pending labels while disabling form actions", async () => {
      const user = userEvent.setup();
      const props: TransactionFormProps = {
        variant,
        draft,
        isEditing: false,
        isBusy: true,
        isSubmitting: true,
        error: "",
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      };
      const view = render(<TransactionForm {...props} />);
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
      const fields = getTransactionFields();
      expect(fields.date).toBeDisabled();
      expect(fields.amount).toBeDisabled();
      expect(fields.category).toBeDisabled();
      expect(fields.memo).toBeDisabled();
      expect(fields.category).toHaveValue(draft.category);
      expect(
        screen.queryByRole("button", { name: "Cancel" }),
      ).not.toBeInTheDocument();

      view.rerender(<TransactionForm {...props} isEditing />);
      await user.click(
        screen.getByRole("button", { name: "Saving changes..." }),
      );
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(props.onSubmit).not.toHaveBeenCalled();
      expect(props.onCancel).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

      view.rerender(
        <TransactionForm {...props} isBusy={false} isSubmitting={false} />,
      );
      expect(
        screen.getByRole("button", { name: `Add ${variant}` }),
      ).toBeEnabled();
      expect(fields.category).toHaveValue(draft.category);
    });

    it("derives totals, forwards row actions and marks only the deleting row pending", async () => {
      const user = userEvent.setup();
      const props = {
        variant,
        transactions: [
          transaction,
          { ...transaction, id: 42, category: "Second", memo: "" },
        ],
        isLoading: false,
        isBusy: false,
        deletingId: null as number | null,
        listError: "",
        deleteError: "",
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      };
      const view = render(<TransactionList {...props} />);
      expect(screen.getByText("2 transactions")).toBeInTheDocument();
      expect(screen.getByText("Total", { exact: false })).toHaveTextContent(
        "Total €25.00",
      );
      const rows = screen.getAllByRole("listitem");
      expect(
        within(rows[0]).getByText("15/01/2026 · Original note"),
      ).toBeInTheDocument();
      expect(within(rows[1]).getByText("15/01/2026")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Edit Original" }));
      await user.click(screen.getByRole("button", { name: "Delete Original" }));
      expect(props.onEdit).toHaveBeenCalledWith(transaction);
      expect(props.onDelete).toHaveBeenCalledWith(transaction);

      view.rerender(
        <TransactionList {...props} isBusy deletingId={transaction.id} />,
      );
      const pending = screen.getByRole("button", {
        name: `Deleting ${variant}`,
      });
      expect(pending).toBeDisabled();
      expect(pending).toHaveAttribute("aria-busy", "true");
      expect(
        screen.getByRole("button", { name: "Delete Second" }),
      ).toHaveAttribute("aria-busy", "false");
      expect(
        screen.getByRole("button", { name: "Delete Second" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Edit Second" }),
      ).toBeDisabled();
      await user.click(pending);
      expect(props.onDelete).toHaveBeenCalledOnce();
    });
  },
);
