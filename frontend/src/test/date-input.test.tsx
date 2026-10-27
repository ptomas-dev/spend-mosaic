import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DateInput } from "../components/DateInput/DateInput";
import { parseCalendarDate, displayCalendarDate } from "../domain/transactions/dates";

function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState("2024-02-15");
  return (
    <>
      <DateInput label='Date' value={value} onChange={setValue} disabled={disabled} required />
      <output aria-label='Stored date'>{value}</output>
    </>
  );
}

describe("DateInput", () => {
  it("displays dd/mm/yyyy and emits ISO after manual entry", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const input = screen.getByLabelText("Date");
    expect(input).toHaveValue("15/02/2024");
    await user.clear(input);
    await user.type(input, "31/12/2026");
    expect(input).toHaveValue("31/12/2026");
    expect(screen.getByLabelText("Stored date")).toHaveTextContent("2026-12-31");
    expect(input).toBeValid();
  });

  it.each(["31/02/2026", "29/02/2025", "1/2/2026", "15/13/2026", "00/01/2026"])(
    "rejects invalid date %s", (text) => {
      render(<Example />);
      fireEvent.change(screen.getByLabelText("Date"), { target: { value: text } });
      expect(screen.getByLabelText("Date")).toBeInvalid();
      expect(parseCalendarDate(text)).toBeNull();
    },
  );

  it("selects leap day and restores focus to the calendar button", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const button = screen.getByRole("button", { name: "Choose date" });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "29/02/2024" }));
    expect(screen.getByLabelText("Date")).toHaveValue("29/02/2024");
    expect(screen.getByLabelText("Stored date")).toHaveTextContent("2024-02-29");
    expect(screen.queryByRole("region", { name: "Date calendar" })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("navigates months across a year boundary and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "31/12/2026" } });
    await user.click(screen.getByRole("button", { name: "Choose date" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("January 2027")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("December 2026")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Choose date" })).toHaveAttribute("aria-expanded", "false");
  });

  it("disables typing and calendar selection together", () => {
    render(<Example disabled />);
    expect(screen.getByLabelText("Date")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Choose date" })).toBeDisabled();
  });

  it("preserves the stored calendar date regardless of timezone offset", () => {
    expect(displayCalendarDate("2026-01-01T00:30:00+14:00")).toBe("01/01/2026");
    expect(parseCalendarDate("29/02/2024")).toBe("2024-02-29");
  });
});
