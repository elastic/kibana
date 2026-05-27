# Common Mistakes

These are the most frequent ways this skill produces low-quality output. Check against this list during the self-review (Step 3) before saving any draft. Each entry includes a concrete ❌ **Bad** example (most are observed from real agent runs) and the ✅ **Good** alternative.

## Contents

- [Hallucinating scenarios](#hallucinating-scenarios)
- [Duplicating sub-issue coverage](#duplicating-sub-issue-coverage)
- [Speculative optional sections](#speculative-optional-sections)
- [UI-step Gherkin](#ui-step-gherkin)
- [Overlooking sub-issue acceptance criteria](#overlooking-sub-issue-acceptance-criteria)
- [Overlooking PR artifacts](#overlooking-pr-artifacts)
- [Known Limitations inconsistency](#known-limitations-inconsistency)
- [Ignoring the Core rule](#ignoring-the-core-rule)

## Hallucinating scenarios

Writing test scenarios for features or behaviours not explicitly described in the issue, sub-issues, linked PRs, or Figma designs. If it is not in a source, it does not belong in the test plan.

❌ **Bad** — A scenario titled *"Given a user opens the Sentinel onboarding wizard, When they click `Connect`, Then they see a success toast"* when neither the issue nor any linked PR mentions a *Connect* button or a success toast.

✅ **Good** — Every UI element, error message, state, and behaviour referenced in a scenario must be traceable to a source. If a behaviour is plausible but unsourced, omit it or flag it as a gap in *Known Limitations*.

## Duplicating sub-issue coverage

Writing scenarios that are already covered in a sub-issue test plan. Always cross-check existing test plans found in Step 1 before writing scenarios.

❌ **Bad** — Adding 4 scenarios for *"User generates an installation token via the Fleet UI"* when the sub-issue test plan (e.g. #16937) already has those 4 scenarios verbatim.

✅ **Good** — In Step 1, list sub-issue test plans alongside the AC consolidation. In Step 3, reference sub-issue coverage in the AC mapping (e.g. *"AC #25 — covered by #16937 test plan, scenarios 1–4 — not duplicated here"*) and skip rewriting them.

## Speculative optional sections

Including RBAC, upgrade, CCS, multi-space, or multi-tenant sections when the issue does not explicitly warrant them. Each optional section has a clear inclusion criterion in [`optional-scenarios.md`](optional-scenarios.md) — if the criterion is not met, omit the section entirely.

❌ **Bad** — Adding a 6-scenario RBAC matrix because the user said *"be thorough"*, even though the issue body mentions no roles or permissions.

✅ **Good** — Apply the inclusion criteria from [`optional-scenarios.md`](optional-scenarios.md) per section. If the criterion is not met, omit. If unsure, ask the user — never add a section speculatively.

## UI-step Gherkin

Writing scenarios that describe clicks and UI interactions instead of user intent and expected behaviour. See [`optional-scenarios.md`](optional-scenarios.md) for the correct approach and a valid example.

❌ **Bad** — *"Given the user clicks the `Add` button, When they fill in the form, Then they click `Save`."*

✅ **Good** — *"Given a user with the `Edit rule` privilege, When they add a custom action to a rule, Then the rule executes the action on the next run."*

## Overlooking sub-issue acceptance criteria

Checking only the high-level acceptance criteria from the parent issue while missing individual criteria buried in sub-issue bodies or comments. The consolidated AC list from Steps 1–2 must be walked item by item during the self-review.

❌ **Bad** — Producing a draft for an epic that walks only the 5 parent ACs and silently omits 8 sub-issue ACs found in sub-issue bodies.

✅ **Good** — In Step 1, consolidate parent ACs + every sub-issue AC into a single numbered list. In Step 3, walk that list item by item and verify each is covered or excluded with a documented reason.

## Overlooking PR artifacts

Reading PR file lists at summary level without mapping individual new routes, services, schemas, or components to scenarios. Every new API endpoint, saved object type, or UI page in a PR should have at least one scenario — the PR artifacts inventory exists for this purpose.

❌ **Bad** — Reading the PR file list as *"12 files changed, mostly UI"* and writing scenarios only from the issue text.

✅ **Good** — In Step 1, build a PR artifacts inventory: every new API route, service method, saved object type, feature flag, and UI component is enumerated. In Step 3, every inventory item maps to at least one scenario.

## Known Limitations inconsistency

Claiming in Known Limitations that a scenario covers something, or that a gap exists, without verifying against the actual scenario list. Every claim in Known Limitations must match reality.

❌ **Bad** — Known Limitations claims *"RBAC coverage is provided via the scenario `Editor cannot delete rule`"*, but no scenario by that name exists in the document.

✅ **Good** — After Known Limitations is written, search the document for each scenario name it cites. Every claim about a scenario being included or excluded must be verifiable on the page.

## Ignoring the Core rule

Proceeding past a point of uncertainty instead of stopping and asking the user. The Core rule is reinforced by the *Red flags — STOP and ask* table in [`SKILL.md`](../SKILL.md) — review it whenever a tempting shortcut surfaces.

❌ **Bad** — The issue says *"see the attached Google Drive doc"*, the doc fetch fails, and the agent paraphrases what the alt text suggests rather than flagging the gap.

✅ **Good** — Stop. Add a `⚠️` entry in *Known Limitations* describing the missing source. Ask the user to share the content directly, or proceed only with what was readable.
