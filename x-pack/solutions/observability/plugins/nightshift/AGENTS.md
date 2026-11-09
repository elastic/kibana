# Nightshift: Agent Context

This file applies to the `nightshift` plugin. `nightshift_investigations`, `nightshift_sources` and `@kbn/nightshift-shared` point here for the testing rule below.

Source of the rule: `ai-essentials/rules/test-value.mdc` (copied in, keep in sync by hand).

PR description rule: follow the [`nightshift-pr-description` skill](../../../../../.agents/skills/nightshift-pr-description/SKILL.md) when writing or rewriting a pull request description. It scales what the description shows to the change's risk tier.

# Tests earn their place

Every test runs on every CI run, forever, and costs money, time and review attention. Write the smallest set that protects the behaviour of the change. A change that needs no test gets none, and the report says why.

## Write a test when it covers behaviour

- An observable outcome through the public interface: what a caller gets, what is stored, what is sent.
- A boundary or edge case that can realistically break: empty input, the exact threshold, retry after a partial failure, a missing dependency.
- A bug that happened: one regression test that fails without the fix.
- A contract other code relies on, including which error surfaces.

## Do not write

- **Assertions against a copy.** `expect(DEFAULT_TIMEOUT_MS).toBe(5000)`, a config object compared to the same literal, a default compared to the line that sets it. It fails only when someone edits the value on purpose.
- **Tests that mirror the implementation.** Expected values computed with the same formula, a mock asserted to be called with exactly the arguments the code passes, private helpers, call order.
- **Shape or type checks** the compiler already enforces, `toBeDefined()`, `assert.ok(true)`, "renders without crashing".
- **Glue.** Getters and setters, pass-through wrappers, re-exports, dependency wiring, a framework or library behaving as documented.
- **Large snapshots.** Assert the values that matter.
- **Variants of the same path.** A second test with different data through the same branch. Use one table-driven test when the variants are genuinely different inputs.
- **Anything that still passes with the implementation deleted.**

## Choose the cheapest level that can fail for the right reason

Unit before integration before end-to-end. Do not add an integration or end-to-end test for what a unit test already proves. No sleeps, no network, no real clocks where a fake does the job. A slow test must justify its cost in the report.

## Size

- One test per behaviour. Extend an existing test or file before adding a new one.
- No coverage targets. Coverage is a by-product, not a goal.
- Do not delete or weaken other people's tests to make room. Removing a test of your own that fails these rules is fine.

## Check each test before keeping it

1. Which real bug would this catch? If you cannot name one, drop it.
2. If the implementation were deleted, would it fail? If not, drop it.
3. Would a harmless refactor break it? If so, it tests structure, not behaviour. Rewrite it or drop it.

When the right number of tests is zero (a constant, config or rename, wiring, docs, a change the existing tests already cover), add none and say so in one line with the reason. That is a decision, not a skipped check.

# Where code goes in `public/`

These rules apply to every new file and to any file you move. Older folders don't follow them yet (see "Legacy folders").

| Folder | Holds | May import |
|---|---|---|
| `application/` | App root and router shell | anything below |
| `pages/<route>/` | One folder per route. Code that only this page uses stays inside it | `components/`, `data/`, `hooks/`, `common/`, `chat/` |
| `components/entities/<entity>/` | Widgets for one record type (flyouts, lists, charts) that more than one page uses. May fetch | `components/ui/`, `data/`, `hooks/`, `common/`, `chat/` |
| `components/ui/` | Presentational pieces: props in, no fetching | `hooks/` (theme only), `common/` |
| `components/` (other files) | App chrome and global flyouts that more than one page uses | `components/ui/`, `components/entities/`, `data/`, `hooks/`, `common/` |
| `data/<domain>/` | Queries, mutations and API helpers, one folder per domain | `hooks/`, `common/`, other `data/` domains |
| `hooks/` | Generic hooks with no domain: `useKibana`, timefilter, chart theme, developer mode | `common/` |
| `common/` | Pure TS helpers and constants. No React, no fetching | `common/` only |
| `chat/` | Agent Builder attachments and "open in chat" | `components/`, `data/`, `common/` |
| `index.ts`, `plugin.ts`, `start_services.ts`, `types.ts` | Registration only | `application/` and `chat/` through `import()`, plus `common/` |

## Rules

- A page never imports another page. If two pages need the same code, move it to `components/` or `data/` first, then import it from both.
- `data/`, `hooks/` and `common/` never import from `components/`, `pages/` or `application/`.
- Never add a new folder at the root of `public/`. Pick a row from the table.
- Query keys go in `data/query_keys.ts`. Invalidate key families from there, not another page's hooks.
- A new page or tab is a module-scope `React.lazy` import. A heavy flyout or editor loads on open, like `SourceFlyout` in `sources/sources_view.tsx`.
- Import individual files. Don't add barrel files that re-export a folder.
- The plugin entry (`index.ts`) exports the initializer and types only. Never export page UI from it.

## Legacy folders

These folders predate the layout and will move under `pages/`, `components/` or `data/` over time: `app/`, `automations/`, `custom_context/`, `knowledge/`, `landing/`, `onboarding/`, `settings/`, `sources/`, and `nightshift_page.tsx`.

- Edit files in place. Don't move a legacy folder as a side effect of a feature change.
- A new file that only that legacy page uses can go inside its folder.
- A new file that more than one page uses goes in the target folder from the table, even when the feature lives in a legacy folder.
- Don't add a new import from one legacy folder into another. If you need code from another page, move that code first.
