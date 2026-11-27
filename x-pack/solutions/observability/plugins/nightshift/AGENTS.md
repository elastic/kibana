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

These rules apply to every new file and to any file you move.

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

# Telemetry

Every user action in `public/` must send an EBT click event. Use click tags first. Add a custom event only when a click tag cannot carry the fact.

## Click tags

- Spread `getEbtProps({ action, element, detail })` from `@kbn/ebt-click` on each control a user can act on: button, link, menu item, switch, tab, and confirm or cancel button in a modal.
- Add new action and element names to `public/common/ebt_constants.ts`. Do not inline strings.
- Before you add or change a tag, fetch the EBT click tracking guidelines and follow them:
  `gh api repos/elastic/observability-dev/contents/docs/telemetry/ebt-click-tracking-guidelines.md -H "Accept: application/vnd.github.raw"`
- Use EUI controls (`EuiButton`, `EuiButtonIcon`, `EuiLink`) for every tagged control. A control that renders a `<button>` fires `click` on Enter and Space. A control that renders an `<a href>` fires `click` on Enter only. A custom control that acts on a key handler without a `click` event is not tracked. Route its keyboard activation through the same `click` path.
- Do not track typing in fields. Click tracking records click intents only.
- Do not leave `@kbn/telemetry(ebt_props_should_be_present)` warnings on code you add or change.
- A tag on an ancestor counts: `track_clicks.ts` reads the whole ancestor chain. Do not tag a container that holds other controls. A click on an untagged child then sends the container's action, and a click on a tagged child sends both.
- `track_clicks.ts` listens on `window` in the bubble phase. Never call `stopPropagation()` on or above a tagged control. To stop a clickable parent (row, card) from reacting, mark the inner control with `data-prevent-row-click` and make the parent handler return early when `event.target.closest('[data-prevent-row-click]')`. Also return early when `!event.currentTarget.contains(event.target)`: a click from a portaled menu bubbles through React but is outside the row in the DOM, so `closest()` cannot see its marker. This stops the parent handler only, not the parent's tag. Do not tag a clickable row or card. Tag its primary open control, such as the title button or link, and tag each secondary control separately. If the row body keeps its own click handler, that handler is another open path. Make the tagged control the only way to open the row, or tag the body region that handles the click.
- Tag a control with `getEbtProps`. Do not rely on `data-test-subj`: a reused DOM node can change it before the listener runs.

## Custom events

Add a custom event type only for these cases, and give the reason in the PR description:

- The fact is not a click: daily state counts, or a server-side change with no UI path (API, workflow).
- The click does not carry the outcome you need, for example success or failure of the request.

These are not valid reasons: "it is a state change", "it is important". A click on Save, Delete or a switch already records that the user did it. Extend the daily snapshot with new fields before you register a new event type.

## Verify

Run Kibana with `telemetry.localShipper: true`. Click each tagged control with real mouse and keyboard input. Read click events in the `ebt-kibana-browser` index. Check that `properties.target` holds the expected `data-ebt-action=...` entry and no unexpected ancestor tag. Check that each click sends one event.
