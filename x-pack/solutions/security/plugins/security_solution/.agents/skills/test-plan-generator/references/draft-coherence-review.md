# Draft Coherence Review

This file defines a **holistic re-read** of a test plan document against the gathered context corpus. See the [*When to run*](#when-to-run) table for the exact positions in each mode (generate, update pre-gate, update post-changes).

The existing self-reviews are itemised and mechanical (per-scenario rules, per-section coverage, sum-checks, item-by-item AC walks). They catch defects locally but pass clean even when the draft as a whole reads inconsistently — e.g. *Overview* describes a UI flow while every scenario is backend, or *Scope* says X+Y but scenarios only test X. This file fills that gap.

---

## When to run

Once per scenario cohort — never per scenario. Skip in publish mode. The run positions differ by mode:

| Mode | Position in the flow | Target document |
|---|---|---|
| Generate (draft mode) | `SKILL.md` Step 3 *Saving the draft* — after sub-steps 1 (Gherkin self-review) and 2 (`common-mistakes.md` review), before sub-step 3 (Step 3.5 Coverage Ratio) | The complete assembled draft |
| Update / regenerate (pre-gate) | `mode-update.md` Step 5 — as part of the *Published plan violates the current draft coherence review* trigger, **before** the "empty change list" gate | The **published plan** (evaluated as if it were the current draft) |
| Update / regenerate (post-changes) | `mode-update.md` Step 6 self-review — after the identified changes have been applied | The full updated document |

The two runs in update mode serve distinct purposes:

- **Pre-gate run** detects skill-rule compliance gaps introduced by rule changes since publication (e.g. missing always-evaluated coverage, stale hardcoded upgrade versions). Any `⚠️` or `❌` forces the "empty change list" gate to become non-empty and populates the `SKILL_RULE_MIGRATIONS` list consumed by Step 7's announcement.
- **Post-changes run** is the final quality gate on the updated document, catching any incoherence introduced by the changes themselves.

Fresh drafts (generate mode) only need one run because there is no published baseline to check against.

---

## How to run

Read the draft from top to bottom as if seeing it for the first time. For each row in the two tables below, decide:

- **✅ Consistent** — the draft satisfies the check.
- **⚠️ Drift** — the draft is internally consistent but has drifted from the gathered context (issue body, sub-issue bodies, parent epic, PR diffs, images, Figma).
- **❌ Incoherent** — the draft contradicts itself between sections.

For every ⚠️ or ❌, **fix the draft before saving**. Document why a fix is not possible (rare) only as a `⚠️` entry in *Known Limitations*.

This review is the last quality gate before Coverage Ratio computation — do not move on with a ⚠️ or ❌ still unresolved.

---

## Document-as-whole coherence

These checks compare sections of the draft against **each other**. They catch internal contradictions the itemised checks pass clean on.

| # | Check | What to verify | Common failure |
|---|---|---|---|
| D1 | *Overview* ↔ scenarios | The feature described in *Overview* is the feature the scenarios actually test | *Overview* mentions a UI flow but every scenario is backend-only |
| D2 | *Feature Background* ↔ *Scope* | The motivation and the in-scope bullets describe the same feature shape | *Feature Background* is about feature X; *Scope* says X+Y |
| D3 | *Scope (in scope)* ↔ scenarios | Every bullet in *In scope* maps to at least one scenario; no scenarios test something not in scope | *In scope* lists *"deleting a note"* but no scenario covers deletion; or a scenario tests editing when editing is *Out of scope* |
| D4 | *Scope (out of scope)* ↔ scenarios | Nothing in *Out of scope* is tested by any scenario, even partially | A scenario implicitly tests an *Out of scope* path as a side-effect |
| D5 | *Acceptance Criteria* ↔ scenarios | Every numbered AC maps to at least one scenario; every scenario traces back to at least one AC or to a Pending-work AC | Floating scenario with no AC trace; AC with no scenario coverage |
| D6 | *Known Limitations* ↔ *Sources Summary* | Every ⚠️ source referenced in *Known Limitations* (inaccessible Figma, no PR linked, external doc not fetched) appears with the matching status in *Sources Summary*, and vice versa | KL mentions Figma was inaccessible but Sources Summary lists Figma as `✅ Read` |
| D7 | *Known Limitations* ↔ scenarios | Every scenario name cited in KL exists in the document; every gap described in KL is actually a gap | KL references a scenario name that does not exist; or KL claims coverage that no scenario provides |
| D8 | Voice and detail level across scenarios | Scenarios in the same feature area use the same level of detail and the same vocabulary | One scenario uses precise component names while a sibling scenario uses *"the user clicks the button"*; mixed first-person and third-person |
| D9 | *Test Execution Notes* ↔ *Test Scenarios* | Every scenario rendered in *Test Scenarios* appears verbatim under its priority in *Test Execution Notes*, and nothing else | A scenario was renamed late but *Test Execution Notes* still references the old name |

---

## Source fidelity

These checks compare the draft against **the gathered context**, not against itself. They catch drift between what the agent read in Step 1 and what it wrote in Step 3.

| # | Check | What to verify | Common failure |
|---|---|---|---|
| S1 | *Acceptance Criteria* copy is verbatim from the issue | Each numbered AC is the exact text from the source issue, or is annotated as inferred when paraphrased | Agent paraphrased an AC to make it more "testable" and lost the original meaning |
| S2 | *Feature Background* motivation matches the issue | The "why" described in *Feature Background* matches the issue body and parent-epic background — not invented from pre-trained knowledge | Plausible-sounding motivation that has no source in the issue corpus |
| S3 | *Assumptions* match the gathered facts | License level, user role, deployment type, data setup all come from the issue corpus (parent epic, sub-issues, PRs, images, Figma) — not assumed from defaults | Issue says nothing about license tier; draft asserts *"Enterprise"* without source |
| S4 | UI element names, error strings, telemetry fields, feature-flag names in scenarios match the source | Every concrete fact in a Gherkin step appears in either the issue corpus or the PR/code (matching its `origin` tag from `gathering-context.md`) | Scenario references a button labelled *"Save"* when the issue calls it *"Submit"* and the PR shows neither |
| S5 | *Out of scope* matches the issue's *Out of scope* | The draft's *Out of scope* bullets reflect what the issue declared out of scope, not the agent's interpretation of what would be inconvenient to test | Draft adds *"performance testing"* to *Out of scope* even though the issue does not exclude it |
| S6a | Optional and always-evaluated coverage present iff trigger fires | Optional sections (RBAC / CCS / Multi-space / Multi-tenant) obey the include-if criteria in [`optional-scenarios.md`](optional-scenarios.md#optional-section-templates). Always-evaluated coverage (Upgrade / CRUD per persisted object / Dependency data lifecycle) either produces scenarios or an *Out of scope* bullet with a one-clause reason on the same line — see [Always-evaluated coverage](optional-scenarios.md#always-evaluated-coverage). Feature-flag state, PR narrative silence, and "assumed not needed" are never valid reasons for omission. | RBAC section included because the user said *"be thorough"*; no Upgrade section even though the feature ships an SO / config / navigation change; U or D of a persisted object silently missing; a referenced object can be deleted by its owner but no scenario covers the dangling case; an *Out of scope* bullet with no reason |
| S6b | Upgrade source versions are fresh | Where upgrade scenarios are present, their source versions must match the values resolved right now from [`optional-scenarios.md#upgrade-scenarios`](optional-scenarios.md#upgrade-scenarios). Versions frozen at generation time against a past `versions.json` snapshot count as stale drift — published plans predating dynamic version resolution frequently violate this. | Upgrade scenarios cite `9.3.8 → 9.4` when `versions.json` now resolves to `9.5.0 → 9.6` |
| S7 | *Known Limitations* surfaces every source the agent could not access | Inaccessible Figma, missing Google Doc, external link not fetched, image not analysable — each appears with `⚠️` and a one-line note | An image fetch failed and the agent silently wrote scenarios from the surrounding alt text instead of flagging |
| S8 | Pending work pattern is applied iff the target is an epic with unimplemented sub-issues | Forward-looking scenarios sit under *"Pending work — forward-looking gaps from open sub-issues"*; every Pending AC has `(Pending #N)`; non-epic targets do not use the pattern | Epic target with open sub-issues but no Pending work block; or non-epic target with a Pending work block |

---

## Stop-and-ask

If the review surfaces a contradiction the agent cannot resolve from the gathered context alone (e.g. *Overview* describes a flow the scenarios do not test, but the agent cannot tell which one is right), **apply the Core rule**:

- Mark the conflict with `⚠️` in *Known Limitations*.
- If the user is available, stop and ask before saving.
- If the user is not available, surface the conflict in the chat alongside the *Draft saved* message and leave the `⚠️` in the saved draft.

Never resolve a coherence conflict silently — the next reader will not know the agent made a judgement call.

---

## Output

This review is internal to the agent run. Do **not** publish a section in the test plan listing the check outcomes. The only externally visible artifacts of this step are:

- Edits to the draft that resolve ⚠️ / ❌ findings.
- New or updated `⚠️` entries in *Known Limitations* when a finding cannot be resolved.

After every row is at ✅ Consistent (or its non-resolution is documented in KL), proceed to Step 3.5 — Issue Clarity Assessment (second half).
