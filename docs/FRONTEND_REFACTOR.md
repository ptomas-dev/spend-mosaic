# Frontend Refactor Record

Completed 2026-10-27. The implementation details and day-to-day commands live in
the [frontend README](../frontend/README.md); this document records the decisions
and validation from the refactor.

## Decisions

- RTK Query owns remote transaction data, request status, and cache. No duplicate
  Redux slices or manually synchronized lists were added.
- Expense and income APIs have separate list tags. Successful mutations
  invalidate only their resource; failed mutations do not invalidate.
- Unused query data is cached for 60 seconds. Mount, focus, and reconnect do not
  trigger automatic refetches. No optimistic updates are used.
- Form drafts, editing selection, and displayed errors remain local. Shared
  transaction transformations normalize optional notes, validate payloads,
  and preserve existing amount and date contracts.
- Shared transaction components own presentation only. The router owns active
  navigation state.
- Initial loads, mutations, and refetches block conflicting actions. Cached rows
  stay visible during refetch; a failed refetch reports an error and may leave
  stale rows visible until a successful refresh.
- `VITE_API_BASE_URL` configures the API origin. The Vite proxy handles local
  API requests while allowing HTML navigation to expense and income routes.

## Validation

- `npm run test -w frontend`: 139 tests passed across eight files.
- `npm run build:frontend` and `npm run lint -w frontend`: passed.
- Browser checks covered direct access, refresh, history navigation, desktop and
  mobile layouts, CRUD, pending states, and draft retention after errors. Mocked
  responses were used for browser CRUD; the user subsequently confirmed the
  workflows operate correctly in their environment.
- Integration checks found and fixed direct-route interception by the Vite
  proxy and a synchronous mutation guard that could remain locked after repeated
  local validation errors.

## Limitations

- API normalization checks finite numeric amounts and nullable notes; it is not
  full response-schema validation.
- At dependency installation, npm reported nine vulnerabilities (two moderate,
  seven high) and install-script policy warnings. This refactor did not apply
  audit fixes or change install-script policy; review separately.
- Dashboard, reports, settings, visual redesign, and changes to backend
  financial precision or date semantics were out of scope.
