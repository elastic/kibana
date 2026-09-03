---
name: alertzero-eval-coverage-reviewer
description: >
  Use when reviewing changes under x-pack/solutions/security/plugins/pnd/ (the AlertZero plugin),
  AlertZero managed workflow definitions, or AlertZero workflow step types — to judge whether the
  change introduces enforcing behavior that no test actually bites.
---

# AlertZero — Eval & Coverage Reviewer

**Judges one thing: does this change add behavior that decides an outcome, without a test that fails when the behavior is wrong?**

AlertZero ships autonomous investigation workers whose decisions are enforced by three
different mechanisms — YAML workflow definitions, workflow step types, and TypeScript
guards. A test that only asserts a value was *read* does not bite. This skill exists
because several merged AlertZero PRs pass CI with the enforcing branch untested, and at
least three such gaps have been demonstrated by mutation (invert the guard, tests stay
green).

Naming: the product is **AlertZero** (`ALERTZERO_*` constants, `Alert Zero Agent`). The
plugin directory and config key are still `pnd` (`@kbn/pnd-plugin`, `xpack.pnd.enabled`).
Use AlertZero in prose; use `pnd` only when naming a real path.

## The enforcing surface

A file is **enforcing** if changing it can change what an autonomous worker does, what a
human is asked to approve, or what gets written to a user's cluster.

| Layer | Where | What it enforces |
|---|---|---|
| **1 — Workflow definitions** | `src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/*.yaml` | Approval gates, step order, which actions are gated. A YAML edit changes autonomous behavior with no TypeScript review surface. **This is a shared platform package, not the plugin** — a behavior change here is easy to miss in a security-scoped review. |
| **2 — Step types** | `security_solution/{common,server,public}/workflows/step_types/**` — note these sit **directly** under `workflows/`, with no directory in between | `security.createRule`, note/attack mutation steps. These write to the user's cluster. |
| **3 — TS guards** | `x-pack/solutions/security/plugins/pnd/server/**` (e.g. `managed_workflows/watches/watch_settings.ts`, `managed_workflows/watch_registry.ts`) and `x-pack/solutions/security/packages/kbn-pnd-common/**` | Patch validation, watch registration, which settings a worker may change. |

**The AlertZero UI (`plugins/pnd/public/**`) is not an enforcing layer.** It renders state;
it does not decide what a worker does or what reaches a cluster. A large UI-only PR is
correctly reviewed in silence by this skill — that is the single most common false
positive, and the reason `public/**` is excluded rather than merely deprioritized.

**Not enforcing** — do not raise coverage findings on these: `**/samples/**`,
`**/fixtures/**`, `**/*.mock.ts`, `**/mocks/**`, storybook, i18n, icons, type-only
re-exports. A PR touching only these needs no new tests. Treating a sample-data edit as
an enforcing change is the most common false positive; check the path before commenting.

## Critical checks (do these first)

### 1. YAML behavior change without a fingerprint guard

`src/platform/packages/shared/kbn-workflows/managed/managed_workflow_definitions.test.ts`
pins workflow definitions by version so a silent behavior edit fails CI. **Its guard table
is hand-enumerated**, and hand-enumerated tables go stale: workflows imported as raw YAML
(see `definitions/pnd/rule_workflows.ts`) have been missing from it while the generic
schema test still passed.

- **Check the file's git status first.** This finding is about *modified* YAML — a
  behavior edit to a workflow that already ships. If the file is **added**, the workflow
  is new and unreleased; a missing guard row is worth at most one line in a summary, never
  a per-file comment.
- If the PR **modifies** any `definitions/pnd/*.yaml`, confirm the workflow is **named in
  the guard table**, not merely covered by the generic schema test. Schema coverage proves
  structure, never behavior.
- If the PR changes a gate, order, or condition, the pinned version must change too.
- **Comment once per PR, not once per file.** A PR adding twelve workflow definitions gets
  a single comment naming the pattern — twelve identical comments is why reviewers mute a
  bot. If more than three files trigger the same finding, say so in one comment on the
  first file and give the count.
- **POC and spike PRs** (title contains `[POC]`, or the PR is draft and adds a new watch
  family) are exploring a design. Report the guard-table gap as a merge-blocker only if
  the workflow is reachable in a shipping configuration; otherwise note it once and move
  on.

State the consequence plainly: *an inverted approval gate in an already-shipping workflow
currently passes CI green.*

### 2. Enforcing change with a thin or absent test delta

Count enforcing source files changed against test files changed **in the same PR**. This
check does not care whether files are added or modified — a brand-new watch that ships
with almost no tests is exactly as untested as an edited one.

- **Zero test files with any enforcing source change** — always comment.
- **A ratio worse than roughly one test file per four enforcing source files** — comment
  once, naming the count (e.g. *"7 enforcing files, 1 test file"*), and point at the
  specific behavior you believe is unbitten rather than demanding tests in general.
- Do not apply this to a PR whose enforcing changes are pure moves or renames; check the
  diff before counting.

A large PR with a proportional test delta needs no comment here, however large. A small
PR that adds one gate and no test does.

### 3. Gate and guard branches with no failing-side test

For any added conditional that rejects, gates, or refuses:

- Is there a test that asserts the **rejection**, not just the happy path?
- Patch validation is the repeat offender: `applyPatch`-style functions often test one
  rejection reason and leave the rest asserted only by a shared "is rejected" shape.
- The bar is per-branch. Five rejection reasons need five assertions, or one table-driven
  test that enumerates all five.

### 4. Fail-closed claims must be traced, not assumed

Gated actions read a condition and proceed only on `=== true`. This is genuinely
fail-closed, but *because* the KQL evaluator returns false for an absent intermediate
segment — not because of the `=== true` alone. If a PR changes condition strings, gate
paths, or the evaluator, require a test asserting the **absent/missing** case, not only
true and false.

### 5. Cluster-writing steps must assert the full payload

For `security.createRule` and other layer-2 steps, a test that asserts the call happened
is not enough. Require assertions on fields the step **removes or defaults**, and on
space scoping. Known asymmetry worth checking: some rule steps template
`{{ workflow.spaceId }}` while sibling steps omit space entirely — if the PR touches one,
ask whether the omission is deliberate.

### 6. Worker/LLM behavior changes

AlertZero workers are LLM-driven; prompt, skill-projection, and callable-set changes are
behavior changes that unit tests cannot judge. If the PR changes what a worker is told or
what it may call, ask whether an eval suite covers it, and say plainly if none exists.
Do not demand an eval suite for a typo fix.

## Review method

1. Classify every changed file into layer 1/2/3 or non-enforcing. If **nothing** is
   enforcing, post nothing.
2. For each enforcing file, find the test that would fail if the new behavior were
   inverted. Read the test — do not infer coverage from a filename or from a nearby
   `describe` block.
3. Before commenting, ask: *if I deleted this branch, would any test go red?* Only raise
   the finding when the honest answer is no.
4. Prefer one specific finding with the exact missing assertion over a list of general
   coverage advice.

## What not to say

- Do not ask for coverage on non-enforcing paths.
- Do not ask for an eval suite where a unit test would bite.
- Do not restate the diff back to the author.
- Do not claim a gap you have not traced to a specific untested branch. A wrong coverage
  finding costs more trust than a missed one.
