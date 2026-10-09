# Frontend Refactoring Plan

## Objective

Improve component reuse, separation of responsibilities, and state management by integrating Redux Toolkit with RTK Query without changing existing expense and income workflows.

This document allows tasks to be assigned independently of the chat. All items are pending. The original analysis was static: identified risks must be confirmed through tests before being considered reproduced failures.

## Context and Starting Points

- Stack: React 18, TypeScript, Vite, React Router, and Tailwind CSS in an npm workspaces monorepo.
- The pages `frontend/src/pages/ExpensesPage/ExpensesPage.tsx` and `frontend/src/pages/IncomePage/IncomePage.tsx` combine HTTP requests, remote state, forms, and presentation, with similar implementations.
- `frontend/src/components/Sidebar/Sidebar.tsx` stores selection locally, independently of the current route.
- Dashboard, reports, and settings pages are placeholders; implementing them is outside this initiative.
- The analysis found no frontend tests or installed Redux dependencies. Confirm these conditions when starting the first task, as the repository may have evolved.
- Preserve strict TypeScript, StrictMode, hooks rules, ID-based keys, and derived totals.

## Architecture Principles

- RTK Query is the source of remote data, cache, and request state.
- Do not copy RTK Query results into additional slices.
- Fields, validation errors, and editing selection remain local to the form or page.
- The router determines the active route; URL-shareable filters use search params.
- Redux slices are reserved for genuinely shared state, such as preferences, when needed.
- Totals and balance are calculated from the data. Do not store redundant derived state.
- The API layer handles transport, errors, and normalization; pages coordinate workflows; components present data and emit actions.
- Reuse common structure without creating a universal component with many flags.
- Do not introduce useMemo, useCallback, createAsyncThunk, or form libraries without a concrete need.

## Suggested Organization

- Application: store, provider, typed Redux hooks, and route configuration.
- Expense and income features: specific endpoints and types, keeping pages as entry points.
- Shared transaction domain: form, list, row, and shared conversions.
- Shared UI: fields and buttons only where there is actual reuse.
- Shared utilities: dates and currency formatting.

Preserve colocated `index.ts` exports and existing conventions. Decide the final structure within the relevant task, without reorganizing the entire frontend upfront.

## Summary and Dependencies

| ID  | Deliverable                        | Dependencies | Status      |
| --- | ---------------------------------- | ------------ | ----------- |
| T01 | Frontend tests                     | None         | Not started |
| T02 | Router-driven navigation           | T01          | Not started |
| T03 | Concurrent operation protection    | T01          | Not started |
| T04 | Types and transformations          | T01          | Not started |
| T05 | Shared components                  | T03, T04     | Not started |
| T06 | Redux Toolkit setup                | T04          | Not started |
| T07 | CRUD with RTK Query                | T05, T06     | Not started |
| T08 | Documentation and final validation | T02, T07     | Not started |

T02, T03, and T04 can be assigned separately after T01. T06 can run alongside T05, coordinating changes to shared files. Dependencies refer to integrated deliverables, not merely work that has started.

## T01 - Set Up Frontend Tests

- [ ] Confirm the current setup and inspect manifests before changing dependencies.
- [ ] Configure Vitest, React Testing Library, a DOM environment, and MSW, reusing existing configuration where available.
- [ ] Create minimal helpers and tests for loading, empty lists, errors, creation, editing, and deletion on both pages.
- [ ] Document commands for the full suite and focused tests, including a non-watch mode for CI.

**Acceptance criteria:** tests do not depend on the real backend, clean up mocks between cases, and verify observable behavior. Existing basic workflows pass; concurrency regression coverage belongs to T03.

## T02 - Fix Navigation

**Starting point:** Sidebar and route constants currently exported by the Root page.

- [ ] Replace clickable items with NavLink and remove selected state and redundant imperative navigation.
- [ ] Configure exact matching for the dashboard using end.
- [ ] Generate items from configuration and decouple route constants from the layout page.
- [ ] Remove headings used as navigation labels and preserve visible focus.
- [ ] Test direct access, refresh, and back/forward history navigation.

**Acceptance criteria:** selection always reflects the URL, and links work with a keyboard using accessible navigation semantics. No route state is stored in Redux.

## T03 - Protect Concurrent Operations

**Starting point:** submit, edit, and delete handlers and initial loading for expenses and income.

- [ ] Use delayed responses to reproduce saving one record and starting to edit another before the response arrives.
- [ ] Define and implement an operation-blocking or identification policy to avoid losing new drafts.
- [ ] Fix deletingId: prevent simultaneous deletions or track pending requests by ID.
- [ ] Prevent the initial GET from overwriting changes from a later mutation; blocking mutations during initial loading is a simple starting option.
- [ ] Test relevant combinations of saving, editing, cancelling, and deleting, including out-of-order responses.

**Acceptance criteria:** no drafts are lost, pending indicators remain correct, and old responses do not revert the list. Keep the fix small; revisit these guarantees after T07. RTK Query does not replace the UI concurrency policy.

## T04 - Consolidate Types and Transformations

- [ ] Separate API response, domain, and form types where contracts differ.
- [ ] Represent nullable fields correctly, particularly memo, or normalize them at the API boundary.
- [ ] Centralize form-to-payload conversion, finite and positive value validation, and text handling.
- [ ] Centralize currency and date formatting while preserving current behavior.
- [ ] Use a factory to initialize and reset forms with the current date.
- [ ] Test optional fields, invalid conversions, and initialization on different dates.

**Acceptance criteria:** equivalent transformations are not duplicated. Type assertions are not treated as response validation. Any runtime validation must be proportionate to risk and justified, without changing the API's financial contract.

## T05 - Extract Shared Components

- [ ] Extract TransactionForm, TransactionList, and TransactionRow with typed props and callbacks.
- [ ] Keep HTTP outside presentation components and coordinate requests in pages or feature hooks.
- [ ] Preserve genuine differences between expenses and income, passing only necessary configuration, such as labels and visual variants.
- [ ] Encapsulate scrolling to the form with refs instead of looking up elements globally by ID.
- [ ] Simplify presentation conditionals and reuse fields or buttons where this reduces actual duplication.
- [ ] Adapt tests to exercise shared components and integration on both pages.

**Acceptance criteria:** pages reuse the common structure; creating, editing, cancelling, and deleting remain functional. Validation, error messages, labels, focus, and disabled states are preserved. Do not create a manual CRUD hook intended to be immediately replaced by RTK Query.

## T06 - Set Up Redux Toolkit

- [ ] Install @reduxjs/toolkit and react-redux from the repository root in the frontend workspace, preserving only the root lockfile.
- [ ] Configure the store, Provider, RootState, AppDispatch, and typed hooks.
- [ ] Configure a base API with the RTK Query reducer and middleware.
- [ ] Define the base URL, error normalization, and development/production configuration without relying exclusively on the Vite proxy.
- [ ] Document the initial cache, refetch, focus, and reconnection policy; do not enable options unnecessarily.

**Acceptance criteria:** the application starts with a typed store; the API reducer and middleware are registered. There are no empty slices or unnecessary transfers of form state into Redux. Do not add secrets or .env files to the repository.

## T07 - Migrate CRUD to RTK Query

- [ ] Implement list queries and create, edit, and delete mutations for expenses and income.
- [ ] Configure separate tags for each resource and invalidate lists after successful mutations.
- [ ] Replace fetches and manual remote state with generated hooks; remove redundant flags and lists.
- [ ] Preserve drafts when a mutation fails and reset the form only in the correct context after success.
- [ ] Distinguish initial loading from refetching to avoid unnecessarily hiding existing data.
- [ ] Test CRUD, errors, invalidation, page revisits, and all concurrency scenarios from T03.

**Acceptance criteria:** lists update without parallel manual synchronization; operations maintain correct indicators and errors. Returning to a page respects the defined cache policy. Do not introduce complex optimistic updates at this stage.

## T08 - Complete Documentation and Validation

- [ ] Document the final structure, local/remote/global state responsibilities, and test commands.
- [ ] Update the README or changelog with relevant changes to development and user workflows.
- [ ] Run tests and required validations from the repository root: npm run build:frontend and npm run lint -w frontend.
- [ ] Manually verify navigation and CRUD on desktop and mobile, including errors and pending operations.
- [ ] Update task statuses in this document and record any limitations or deferred decisions.

**Acceptance criteria:** all applicable checks pass. Pre-existing failures are separated, documented, and approved according to the repository workflow. The backend placeholder script does not count as validation.

## How to Assign and Complete Tasks

1. Specify the task ID, this document, and dependencies already integrated.
2. Confirm the current file contents before implementing; starting points may have changed.
3. Limit the deliverable to the task objective, including necessary tests and documentation.
4. Record changes, executed commands, results, and limitations in the PR.
5. Check off completed items and update the table only after meeting the acceptance criteria.

Follow the [Git workflow](GIT_WORKFLOW.md): branch from develop for regular work, keep PRs focused, and use Conventional Commits. Do not create commits or branches automatically without an explicit request. Do not revert other people's changes.

## Out of Scope and Deferred Decisions

- Implementing dashboard, reports, or settings.
- Visual redesign, upgrading React, or general repository cleanup.
- Changing the backend financial model. Monetary precision and date semantics require a separate decision before changing the API contract.
- Normalizing entities with createEntityAdapter without a demonstrated need.
- Complex optimistic updates, store persistence, or a form library without concrete requirements.
