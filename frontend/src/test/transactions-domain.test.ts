import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTransactionDraft,
  draftToPayload,
  formatCurrency,
  formatDate,
  normalizeTransaction,
  transactionToDraft,
  type TransactionDraft,
  type TransactionResponse,
} from "../domain/transactions";

const response: TransactionResponse = {
  id: 41,
  date: "2026-01-15T00:00:00.000Z",
  amount: 12.5,
  category: " Original ",
  memo: " Original note ",
};

const draft: TransactionDraft = {
  date: "2026-02-20",
  amount: "27.75",
  category: "Updated category",
  memo: "Updated note",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("normalizeTransaction", () => {
  it("preserves the serialized FLOAT amount, timestamp, and stored text", () => {
    const input = { ...response, createdAt: "2026-01-15T00:00:00.000Z" };
    const result = normalizeTransaction(input);
    expect(result).toEqual(response);
    expect(result).not.toBe(input);
    expect(input.category).toBe(" Original ");
  });

  it.each([null, undefined, ""])("normalizes memo %s to empty text", (memo) => {
    expect(normalizeTransaction({ ...response, memo }).memo).toBe("");
  });

  it("accepts an omitted optional memo", () => {
    expect(
      normalizeTransaction({
        id: response.id,
        date: response.date,
        amount: response.amount,
        category: response.category,
      }).memo,
    ).toBe("");
  });

  it.each([NaN, Infinity, -Infinity])(
    "rejects non-finite amount %s",
    (amount) => {
      expect(() => normalizeTransaction({ ...response, amount })).toThrow(
        "Transaction amount must be finite.",
      );
    },
  );

  it.each([0, -12.5])(
    "does not impose new rules on legacy amount %s",
    (amount) => {
      expect(normalizeTransaction({ ...response, amount }).amount).toBe(amount);
    },
  );
});

describe("createTransactionDraft", () => {
  it("uses the current local date on every call across midnight and year end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 11, 31, 23, 59));
    const first = createTransactionDraft();
    expect(first).toEqual({
      date: "2025-12-31",
      amount: "",
      category: "",
      memo: "",
    });

    vi.setSystemTime(new Date(2026, 0, 1, 0, 1));
    expect(createTransactionDraft()).toEqual({
      date: "2026-01-01",
      amount: "",
      category: "",
      memo: "",
    });
    expect(first.date).toBe("2025-12-31");
  });

  it("returns independent drafts with padded local date fields", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 3, 0, 5));
    const first = createTransactionDraft();
    first.memo = "Changed";
    expect(createTransactionDraft()).toEqual({
      date: "2026-02-03",
      amount: "",
      category: "",
      memo: "",
    });
  });
});

describe("transactionToDraft", () => {
  it("keeps the existing timestamp-prefix editing behavior and string amount", () => {
    const transaction = normalizeTransaction({ ...response, memo: null });
    expect(transactionToDraft(transaction)).toEqual({
      date: "2026-01-15",
      amount: "12.5",
      category: " Original ",
      memo: "",
    });
    expect(transaction.date).toBe(response.date);
  });
});

describe("draftToPayload", () => {
  it("converts amount and trims category without trimming memo or mutating the draft", () => {
    const input = {
      ...draft,
      amount: " 27.75 ",
      category: "  Food and drink  ",
      memo: "  note  ",
    };
    expect(draftToPayload(input)).toEqual({
      date: draft.date,
      amount: 27.75,
      category: "Food and drink",
      memo: "  note  ",
    });
    expect(input.category).toBe("  Food and drink  ");
    expect(input.amount).toBe(" 27.75 ");
  });

  it.each([
    "",
    "   ",
    "abc",
    "12.5oops",
    "NaN",
    "Infinity",
    "-Infinity",
    "1e309",
    "0",
    "-0.01",
  ])("rejects invalid or nonpositive amount %j", (amount) => {
    expect(() => draftToPayload({ ...draft, amount })).toThrow(
      "Date, positive amount, and category are required",
    );
  });

  it.each(["", " \t\n "])("rejects empty category %j", (category) => {
    expect(() => draftToPayload({ ...draft, category })).toThrow(
      "Date, positive amount, and category are required",
    );
  });

  it("rejects missing dates and preserves valid timestamp prefixes", () => {
    expect(() => draftToPayload({ ...draft, date: "" })).toThrow(
      "Date, positive amount, and category are required",
    );
    expect(draftToPayload({ ...draft, date: response.date }).date).toBe(
      response.date,
    );
  });

  it.each(["31/02/2026", "2026-02-30", "invalid"])(
    "rejects invalid date drafts before sending to the API: %s", (date) => {
      expect(() => draftToPayload({ ...draft, date })).toThrow(
        "Date, positive amount, and category are required",
      );
    },
  );

  it("preserves empty and whitespace-only memo", () => {
    expect(draftToPayload({ ...draft, memo: "" }).memo).toBe("");
    expect(draftToPayload({ ...draft, memo: "  " }).memo).toBe("  ");
  });

  it.each(["0.001", "1.234567", "1e2"])(
    "keeps Number conversion without rounding %s",
    (amount) => {
      expect(draftToPayload({ ...draft, amount }).amount).toBe(Number(amount));
    },
  );
});

describe("formatting", () => {
  it("formats EUR in en-GB including totals, negative values, and display rounding", () => {
    expect(formatCurrency(1234.5)).toBe("\u20ac1,234.50");
    expect(formatCurrency(0)).toBe("\u20ac0.00");
    expect(formatCurrency(-12.5)).toBe("-\u20ac12.50");
    expect(formatCurrency(1.234)).toBe("\u20ac1.23");
  });

  it.each([
    "2026-01-01",
    "2026-01-01T00:00:00.000Z",
    "2026-01-01T00:30:00+14:00",
    "2025-12-31T23:30:00-12:00",
    "2026-03-29T01:30:00.000Z",
  ])(
    "formats the stored calendar date as dd/mm/yyyy at boundary %s",
    (date) => {
      const [year, month, day] = date.slice(0, 10).split("-");
      expect(formatDate(date)).toBe(`${day}/${month}/${year}`);
    },
  );

  it("formats a calendar date with zero-padded numeric fields", () => {
    expect(formatDate("2026-01-15")).toBe(
      "15/01/2026",
    );
  });

  it("keeps the existing RangeError for an invalid date", () => {
    expect(() => formatDate("invalid")).toThrow(RangeError);
  });
});
