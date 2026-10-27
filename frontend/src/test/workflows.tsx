import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, type ComponentType, type ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach } from "vitest";
import { api } from "../application/api";
import { createAppStore, type AppStore } from "../application/store";

const stores = new Set<AppStore>();

afterEach(() => {
  cleanup();
  for (const store of stores) store.dispatch(api.util.resetApiState());
  stores.clear();
});

export function createTestStore() {
  const store = createAppStore();
  stores.add(store);
  return store;
}

export function renderWithStore(
  children: ReactNode,
  store = createTestStore(),
) {
  stores.add(store);
  return {
    ...render(
      <StrictMode>
        <Provider store={store}>{children}</Provider>
      </StrictMode>,
    ),
    store,
  };
}

export type TransactionDraft = {
  date: string;
  amount: string;
  category: string;
  memo: string;
};

export function renderTransactionPage(Page: ComponentType) {
  const user = userEvent.setup();
  renderWithStore(<Page />);
  return user;
}

export function getTransactionFields() {
  return {
    date: screen.getByLabelText("Date"),
    amount: screen.getByRole("spinbutton", { name: /^Amount/ }),
    category: screen.getByRole("textbox", { name: /^Category/ }),
    memo: screen.getByRole("textbox", { name: /^Note/ }),
  };
}

export async function fillTransactionForm(
  user: ReturnType<typeof userEvent.setup>,
  draft: TransactionDraft,
) {
  const fields = getTransactionFields();
  for (const field of ["date", "amount", "category", "memo"] as const) {
    await user.clear(fields[field]);
    if (draft[field]) {
      await user.type(fields[field], draft[field]);
    }
  }
}
