# Nightshift: Agent Context

This file applies to the `nightshift` plugin. `nightshift_investigations`, `nightshift_sources` and `@kbn/nightshift-shared` point here for the testing rule below.

Source of the rule: `ai-essentials/rules/test-value.mdc` (copied in, keep in sync by hand).

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
