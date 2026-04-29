# Classification Guide

## Bug Patterns

| Pattern | What to Look For | Where in Kibana |
|---------|-----------------|-----------------|
| `missing_permission_check` | Route handler missing `requiredPrivileges` or authorization check | `server/lib/*/routes/` |
| `stale_data_after_mutation` | `useMutation` without `queryClient.invalidateQueries` in `onSuccess` | `public/*/hooks/`, `public/*/containers/` |
| `hardcoded_size_limit` | `size: 10000` or similar in ES query builders | `server/lib/*/search/`, `server/lib/*/queries/` |
| `ui_restriction_without_api_enforcement` | UI uses `capabilities` or `hasPrivileges` but the API route doesn't check | `server/lib/*/routes/` vs `public/*/components/` |
| `event_propagation` | `onClick` handler on a child inside a clickable parent row | `public/*/components/`, look for `EuiBasicTable` with `rowProps` |
| `missing_lazy_initialization` | Data seeded only at boot; list/get route returns empty for resources created post-boot | `server/lib/*/routes/`, startup migrations, `registerOnPostInit` |

## Test Layer Decision

Always test at the **lowest layer** where the bug behavior can be exercised.

| Layer | When to Use | File Pattern | Location |
|-------|------------|--------------|----------|
| **Unit test** | Pure function, utility, data transformation, business logic — no HTTP/browser needed | `*.test.ts`, `*.test.tsx` | Same directory as source, or `__tests__/` |
| **Integration/API test** | Route handler, server-side logic, API behavior — requires HTTP but not browser | `*.spec.ts` (Scout API) | `test/scout/api/tests/` |
| **Scout UI test** | Bug can ONLY be reproduced through browser interaction | `*.spec.ts` (Scout UI) | `test/scout/ui/parallel_tests/` or `test/scout/ui/tests/` |

**Decision rules** (follow in order):
1. Server-side code (`server/lib/`, routes, ES queries) → **unit test** or **API test**
2. Missing permission check on API route → **API test**
3. Stale cache, size limit, data transformation → **unit test** or **API test**
4. UI rendering, component interaction, event handling → **Scout UI test**
5. When in doubt, prefer the lower layer

## Pattern-to-Layer Mapping

| Pattern | Preferred Layer | What to Test |
|---------|----------------|-------------|
| `missing_permission_check` | API test | Call route with unprivileged user. Assert 403. |
| `stale_data_after_mutation` | Unit test | Call mutation's `onSuccess`. Assert `invalidateQueries` called. |
| `hardcoded_size_limit` | Unit test | Pass >10,000 items. Assert pagination used. |
| `ui_restriction_without_api_enforcement` | API test | Call API with restricted user. Assert 403. |
| `event_propagation` | Scout UI test | Click inner button. Assert parent handler does NOT fire. |
| `missing_lazy_initialization` | API test | Create new space post-boot. Call list API in that space. Assert data is populated. |

When fix touches both server and client, write tests at **both** layers.

## Fix Strategies

| Pattern | Fix Strategy |
|---------|-------------|
| `missing_permission_check` | Add `requiredPrivileges` or `authorization.ensureAuthorized()` to the missing code path |
| `stale_data_after_mutation` | Add `queryClient.invalidateQueries([...])` in mutation's `onSuccess` callback |
| `hardcoded_size_limit` | Replace `size: N` with `search_after`, `scroll`, or `findAll` loop |
| `ui_restriction_without_api_enforcement` | Add server-side authorization check to the API route handler |
| `event_propagation` | Add `e.stopPropagation()` at top of inner element's click handler |
| `missing_lazy_initialization` | Add ensure-on-first-read (lazy init) in the list/get route handler so data is seeded when first accessed, not only at boot |

## Pre-Fix Checklist

Before writing any fix code, complete these checks:

1. **Search for existing patterns** — `rg` the codebase for how similar problems are already solved (e.g., `rg 'multiple-isolated'` for saved object namespace handling, `rg 'namespace.*id'` for ID construction patterns). Adopt the established convention rather than inventing a new mechanism.
2. **Audit hardcoded namespaces** — If the bug involves non-default spaces, `rg "'default'" <affected-module>` to find hardcoded namespace references. Any value derived from a namespace (IDs, index patterns, stream patterns) should be parameterized.
3. **Check plugin boundaries** — Read `kibana.jsonc` to determine which plugin owns the caller and the callee. If they're in different plugins, use routes or contracts instead of direct function imports.
4. **Map the feature lifecycle** — Trace the full lifecycle (install / start / stop / uninstall) and place initialization logic in the correct phase. Don't default to the most generic entry point.
