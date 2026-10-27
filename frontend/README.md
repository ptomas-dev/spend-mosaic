# Frontend

## Architecture and State

- `src/application/`: route and navigation configuration, Redux store, typed
  hooks, and the RTK Query base API. `main.tsx` mounts the Redux Provider.
- `src/features/expenses/` and `src/features/income/`: resource-specific list
  queries and create/update/delete mutations with separate list tags.
- `src/domain/transactions/`: API/domain/draft/payload types, transformations,
  current-local-date form factory, EUR/date formatting, and page coordination.
- `src/components/Transactions/`: controlled TransactionForm, TransactionList,
  and TransactionRow components. Presentation components make no HTTP requests.
- `src/pages/`: thin workflow entry points using generated RTK Query hooks.

RTK Query owns remote records, cache, and request state. Form fields, editing
selection, and displayed mutation/validation errors remain local. A synchronous
guard prevents duplicate actions before React renders pending request state.
The router owns navigation selection; there are no extra Redux slices or copied
remote lists. Lists derive totals from normalized records rather than storing them.

The API preserves numeric amounts without rounding or changing backend precision.
Nullable/omitted notes become empty strings at the boundary. Draft conversion
requires a date, a finite positive amount, and a nonblank trimmed category;
note text is preserved. The finite-amount check is not full schema validation.

## Dates

Full dates are displayed and entered as `dd/mm/yyyy` throughout the UI, regardless
of the browser's locale. Transaction forms and report filters share a text date
field with a white calendar button and a custom month picker. Dates can be typed
or selected with the keyboard or mouse; Escape closes the picker and returns focus
to its button. Invalid and impossible dates are rejected, including non-leap-year
29 February. Empty dates remain allowed for open-ended report filters.

Valid date fields are converted to `yyyy-mm-dd` internally and in API payloads.
Partial or invalid input remains visible for correction and cannot be submitted
or used to generate a report. Display and filtering use the stored calendar-date
prefix, avoiding timezone shifts between the transaction list, editor and reports.
Monthly report labels continue to show only the month and year.

## Reports

Reports reuse the expense and income queries and their existing cache invalidation.
The default range is all time. Optional start and end dates filter both resources
inclusively and update the report immediately; All time clears both bounds.
Filtering uses the stored calendar date (the same date shown in the transaction
editor), without timezone conversion. Reversed ranges and invalid stored dates
produce explicit errors rather than incomplete summaries.

The page shows income, expenses, and net balance for the selected range, monthly
comparison bars with a corresponding accessible totals table, and expense totals
by category. Only months containing matching transactions are shown. Bars use a
shared absolute-amount scale; the table retains signed values. Currency formatting
and numeric precision follow the existing transaction contract.

Both resources must load before a report is shown. Refresh data reloads both
queries and retries failures. Cached reports stay visible during refresh; a failed
refresh displays the API error and a stale-data warning. No chart dependency or
backend endpoint is required.

On small screens, navigation sits above the content and scrolls horizontally.
The monthly totals table scrolls within its own container rather than widening
the page.

## API Configuration and Cache

`VITE_API_BASE_URL` is a public, build-time API base URL, not a secret. For example,
`https://api.example.com/` calls `/expenses` and `/income` on that server;
`/api/` uses a same-origin API prefix. Cross-origin servers must allow the frontend
origin through CORS. Set this variable in the shell or deployment configuration
before starting Vite or building. Do not commit credentials or local env files.

Without this variable, requests use the current origin. In development Vite proxies
API requests to `http://localhost:5000`; requests accepting HTML bypass that proxy
so direct page access and refresh load the SPA. Production requires either an API
base URL or a same-origin reverse proxy, plus SPA fallback for page routes.
If page routes and API paths overlap, the server must distinguish HTML navigation
from API traffic, or use a separate `/api/` prefix.

Unused query data stays cached for 60 seconds. Revisiting a page within this
window reuses its data; there is no automatic refetch on mount, focus, or
reconnection. Successful mutations invalidate only their own resource list;
failed mutations do not invalidate. No optimistic/manual cache updates are used.
Initial loads, mutations, and refetches block conflicting form/row actions.
Refetches keep existing rows visible. If a refetch fails, cached rows remain
visible with an error and may be stale until a successful refresh.

From the repository root, start Vite with explicit options through the workspace:

```bash
npm run dev -w frontend -- --host 127.0.0.1 --port 5174
```

## Frontend Tests

Use Node 20, 22, or 24+ as supported by Vitest 4. This setup was validated with
Node 24.15.0, Vite 6.4.3, and React 18.3.1; no application framework upgrade is
required.

Run commands from the repository root after installing dependencies with `npm install`:

```bash
# Full suite, non-watch mode for local validation and CI
npm run test -w frontend

# One test file (still non-watch)
npm run test -w frontend -- src/test/transaction-pages.test.tsx

# Concurrency and RTK Query integration
npm run test -w frontend -- src/test/transaction-concurrency.test.tsx
npm run test -w frontend -- src/test/transaction-api.test.ts src/test/transaction-rtk-pages.test.tsx

# One page or workflow using the full test name
npm run test -w frontend -- -t ExpensesPage
npm run test -w frontend -- -t IncomePage
npm run test -w frontend -- -t "retains the draft"

# Optional interactive watch mode
npm run test:watch -w frontend

# Required validation gates
npm run build:frontend
npm run lint -w frontend
```

Vitest reuses the Vite configuration and runs React Testing Library in jsdom.
The parameterized transaction suite exercises the real ExpensesPage and
IncomePage under StrictMode: loading, empty lists, list errors, create, edit,
cancel, delete, pending indicators, totals, failed mutations, draft retention,
and retry. Additional suites cover navigation, shared components, domain
conversions, concurrency, resource invalidation, cache expiry, page revisits,
failed refetches, and repeated local validation failures. No backend or database
is required.

### Reusable Test Helpers

- `src/test/server.ts` exports the MSW server and `createResponseGate()` for
  explicitly releasing a pending response without arbitrary sleeps. Default GET
  handlers return empty lists; override them per test with `server.use()` and
  `http.get/post/put/delete` against `http://localhost/expenses` or
  `http://localhost/income` (append an ID for update/delete).
  `createTransactionRecords()` provides mutable records for GET handlers to
  reflect successful mutations when RTK Query invalidation refetches the list.
- `src/test/workflows.tsx` exports `renderTransactionPage(Page)`, returning a
  user-event instance; `getTransactionFields()`; and
  `fillTransactionForm(user, draft)`. Draft amounts are strings; API amounts are
  numbers. These helpers query labels and accessible roles, not CSS selectors.
  `renderWithStore()` wraps components in StrictMode and Provider with a fresh
  store; it accepts an existing store for cache/revisit tests. Stores are reset
  after cleanup to prevent cache, subscriptions, and timers leaking across tests.
- Scope list assertions with `within(screen.getByRole('region', { name:
'Recorded expenses' }))` or `Recorded income`. Row controls have accessible
  names `Edit <category>` and `Delete <category>`. Forms use labeled Date,
  Amount, Category and Note inputs, and Add expense/Add income, Save changes,
  and Cancel buttons. Loading uses `status`; errors use `alert`.
- `src/test/setup.ts` rejects unhandled MSW requests, unmounts React trees,
  resets request handlers, and restores spies between tests. Confirmation spies
  belong to individual tests. A no-op `scrollIntoView` shim permits edit actions
  in jsdom; it does not verify browser scrolling or layout.
- `test-environment.ts` preserves Node's native abort constructors before
  jsdom initializes so native fetch and MSW agree on signal types (including
  Node 24). The setup resolves relative fetch URLs against the jsdom origin;
  actual network transport remains intercepted by MSW, not mocked page logic.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from "eslint-plugin-react";

export default tseslint.config({
  // Set the react version
  settings: { react: { version: "18.3" } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs["jsx-runtime"].rules,
  },
});
```
