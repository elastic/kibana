# Issue Clarity Assessment

This file defines the procedure for evaluating how clearly each GitHub issue describes what the agent needs to build a test plan. Read it at two specific points in the workflow:

1. **After Step 1 (context gathering), before Step 2 (analysis).** Compute the per-issue scores and the combined readability score. Apply the stop-and-ask gate if combined = 1.
2. **At the end of Step 3 (just before saving the draft).** Compute the Issue Coverage Ratio from the finalized scenarios, then assemble and append the assessment section to the draft.

The assessment is published with the test plan so PMs and writers see actionable feedback on the descriptions they authored.

---

## Contents

- [What this metric is — and what it is not](#what-this-metric-is--and-what-it-is-not)
- [Inputs](#inputs)
- [The five dimensions](#the-five-dimensions)
- [Grading anchors](#grading-anchors)
- [The 1–5 rubric](#the-15-rubric)
- [Per-issue score procedure](#per-issue-score-procedure)
- [Combined readability — not an average](#combined-readability--not-an-average)
- [Issue Coverage Ratio](#issue-coverage-ratio)
- [Stop-and-ask gate](#stop-and-ask-gate)
- [Output format](#output-format)
- [Worked example — well-organized epic](#worked-example--well-organized-epic)
- [Worked example — combined=1 case](#worked-example--combined1-case)

---

## What this metric is — and what it is not

**Is:**
- A signal about whether the **issue descriptions alone** carry enough information to derive the test plan, evaluated using the same rubric the skill already uses internally to decide what to ask the user.
- Per-issue (target, parent, every sub-issue), plus a single combined score for the set read together, plus a quantitative Coverage Ratio.
- Published in the GitHub comment as a collapsible section so PMs and writers see the verdict on what they wrote.

**Is not:**
- An evaluation of PR descriptions, code, or commit messages — only issue bodies and issue comments count.
- A quality gate on the PR side or the engineering work itself.
- An attempt to "enrich" content using the agent's pre-trained knowledge — the score is purely a function of what the issue text already contains.

---

## Inputs

The assessment uses the **issue corpus** built during Step 1:

| Source | Counts toward assessment? |
|---|---|
| Target issue body and comments | ✅ Yes |
| Parent issue body and comments | ✅ Yes |
| Every sub-issue body and comments | ✅ Yes |
| Images referenced from any issue body/comment | ✅ Yes (treated as part of the issue) |
| Figma referenced from any issue body/comment | ✅ Yes (treated as part of the issue) |
| Google Docs referenced from any issue body/comment | ✅ Yes (treated as part of the issue) |
| PR descriptions, PR review comments, PR diffs, code | ⛔ No — PR content does **not** count toward the score |
| Inferred context from the agent's pre-trained knowledge | ⛔ No — does not count |

When grading the **UX / UI** dimension below, "the issue has a mockup" means a Figma node or image **linked from an issue body or comment** — not from a PR description.

---

## The five dimensions

Each issue is graded against the same five dimensions. Each dimension is rated **✅ Present**, **⚠️ Partial**, **❌ Missing**, or **N/A** when it does not apply to the kind of work the issue describes.

| Dimension | Question | When N/A applies |
|---|---|---|
| **Acceptance Criteria** | Are the ACs explicit, numbered (or clearly enumerable), and testable from the wording alone? | Never N/A — every issue must have at least implicit ACs. |
| **Scope** | Is it clear what is in scope and what is out of scope? Is there an explicit "Out of scope" section, or unambiguous boundaries? | Trivial single-line bug fixes where scope is self-evident from the title. |
| **UX / UI** | If the feature has UI, is it described in text, screenshot, mockup, or Figma node? Are component names, states, and labels grounded? | Pure API change, pure background job, telemetry-only change, infra change with no UI. |
| **Data & Roles** | Are pre-conditions, fixture data, user roles, RBAC requirements, and license level stated? | Mark N/A only when the feature is **purely backend** (no user-facing flow, no API endpoint requiring authorization beyond default), AND the input data shape is **fully described elsewhere in the issue** (e.g. ARM/JSON shape, KQL examples). Otherwise mark ⚠️ Partial or ❌ Missing as appropriate. |
| **Edge cases** | Are negative paths, error handling, limits, and edge conditions mentioned (even briefly)? Is there a "what should NOT happen" anywhere in the text? | Never N/A — even trivial changes have edge cases. Mark **❌ Missing** rather than N/A when nothing is mentioned. |

**Marking N/A is a judgement call.** When in doubt, mark **❌ Missing** rather than N/A — N/A removes the dimension from the score and biases it upward.

### How N/A affects scoring

The 1–5 rubric below applies to the **applicable dimensions only** (those not marked N/A). Each rubric anchor (*"all applicable dimensions ✅ Present"* for 5, *"at most one applicable dimension at ⚠️ Partial"* for 4, etc.) is read against the count of **applicable** dimensions, not against the literal number 5.

| Applicable dimensions | How the rubric thresholds apply |
|---|---|
| 5 (no N/A) | Rubric applies as written. |
| 4 (1 N/A — common for trivial fixes or telemetry-only changes) | Same thresholds, applied to 4 dimensions. |
| 3 (2 N/A — typical purely-backend feature, UX/UI + Data & Roles both N/A) | Same thresholds, applied to 3 dimensions. Score 1 is only reachable via the AC tie-breaker (3+ ❌ requires three applicable dimensions to be ❌, impossible with 3 total unless all three fail). |
| 2 (3 N/A) | Rare. Re-check whether some dimensions should be ⚠️ Partial rather than N/A before scoring. |

The **AC tie-breaker** (AC ❌ → cap at 2; AC ❌ and Scope ❌ → 1) applies regardless of N/A — Acceptance Criteria is never N/A (see *The five dimensions* table above).

**Worked example.** Pure backend parser: UX/UI = N/A, Data & Roles = N/A, AC = ✅, Scope = ✅, Edge cases = ⚠️. Three applicable dimensions, one at ⚠️ Partial → score = **4**. See [`example-test-plan-backend.md`](example-test-plan-backend.md) for the full assessment block of this case.

---

## Grading anchors

Calibration anchors for each grade across the five dimensions. Use these to decide between ✅ Present / ⚠️ Partial / ❌ Missing when the grading is borderline — the strict rubric below depends on these grades being applied consistently.

| Dimension | ✅ Present | ⚠️ Partial | ❌ Missing |
|---|---|---|---|
| **Acceptance Criteria** | Numbered bullets, specific, testable from wording alone (e.g. *"Importer recognizes `kind: NRT`"*) | Bullets present **in form** but **untestable in content** (e.g. *"works correctly"*, *"with high accuracy"*, *"as expected"*) | No AC section, and no enumerable list of expected behaviours anywhere in the body or comments |
| **Scope** | Explicit `Scope` / `Out of scope` section, **OR** ≥6 testable ACs whose scope boundary is unambiguous from their wording | Implicit boundaries only, or `Out of scope` present without a matching `Scope` section | No mention of what is in or out anywhere in the issue |
| **UX / UI** | Mockup, Figma node, screenshot, **or** detailed text description of layout, states, and labels | UI element named (e.g. *"data-input flyout"*) but layout / states / labels not described | UI implied by the feature but no description, mockup, or component name anywhere |
| **Data & Roles** | Data shape examples + roles/RBAC/license explicitly stated (user-facing feature); **OR** full data shape examples for a purely backend feature | Some data shown but roles or license missing for a user-facing feature; or roles stated but no data shape | Neither data shape nor roles/license addressed |
| **Edge cases** | Negative paths, error handling, limits, or *"what should NOT happen"* explicitly listed | Only the `Out of scope` section enumerates exclusions — no positive enumeration of error paths or limits | No `Out of scope`, no error/edge bullets, no limits — nothing |

**Reading the anchors:**

| AC grade | Score effect |
|---|---|
| AC ✅ Present **and** ≥6 testable ACs | **Floor of 3** — strong ACs implicitly carry Scope and Edge cases, so the score lands at 3 or higher even when those dimensions are ⚠️ Partial. |
| AC ✅ Present **and** <6 testable ACs | No floor, no cap — the rubric is applied as written. |
| AC ⚠️ Partial (bullets present but untestable) | **Ceiling of 3** — the strict AC cap (`AC ❌ → max 2`) does not apply, but the rubric cannot reach 4 from a ⚠️ AC. |
| AC ❌ Missing (no AC section, no enumerable list) | **Ceiling of 2** — the strict AC cap applies regardless of other dimensions. |

Independent of the AC grade:

| Other anchor pattern | Effect |
|---|---|
| Scope ✅ via strong ACs (no explicit `Scope` section) | Still counts as ✅ Present — do not down-grade for the missing `Scope` heading alone. |
| 3+ applicable dimensions ❌ Missing, including AC or Scope | Per-issue score lands at **1** (overrides the AC ✅ floor above when both conflict). |

---

## The 1–5 rubric

Apply this rubric **per issue** based on the dimension grades above. The rubric is calibrated to one question: *"Can the test plan for this issue be derived almost entirely from this issue's text?"*

| Score | Anchor | Pattern |
|---|---|---|
| **5 — Excellent** | All applicable dimensions ✅ Present. | Numbered ACs, explicit scope, UI grounded by mockup or Figma, data/roles stated, edge cases listed. A reviewer reading only the issue can write the test plan with no other context. |
| **4 — Good** | At most one applicable dimension at ⚠️ Partial; the rest ✅ Present. | Minor gaps — e.g. ACs are clear but one edge case is hand-waved, or UI is described in text without a mockup. PR is needed only for a small number of details (exact error string, field name). |
| **3 — Adequate** | Two applicable dimensions ⚠️ Partial, or one ❌ Missing while the others are ✅ Present. | Core ACs present but the PR is needed for important specifics (UI exact wording, error messages, non-obvious scope boundary). The plan is derivable in shape but not in detail. |
| **2 — Weak** | Two applicable dimensions ❌ Missing, or three+ at ⚠️ Partial. | Description is vague, ACs are implicit or buried in prose. The test plan is essentially reverse-engineered from the PR. |
| **1 — Insufficient** | Three+ applicable dimensions ❌ Missing, including either Acceptance Criteria or Scope. | A title and a paragraph. Without the PR, no testable scenario can be derived. **Triggers the stop-and-ask gate at the combined level — see below.** |

**Tie-breakers:**
- If the **Acceptance Criteria** dimension is ❌ Missing, the maximum per-issue score is capped at **2** — no exceptions.
- If both **Acceptance Criteria** and **Scope** are ❌ Missing, the per-issue score is **1**.

---

## Per-issue score procedure

For each issue in the corpus (target, parent, every sub-issue):

1. Read only the body and comments of that single issue. Treat parent and sub-issue content as belonging to those other issues, not this one — a sub-issue with no ACs of its own does not "borrow" the parent's ACs for the per-issue score.
2. Grade each of the five dimensions (✅ / ⚠️ / ❌ / N/A) using the criteria above.
3. Apply the rubric and tie-breakers to assign a score 1–5.
4. Write a **critical gaps** note in 1–2 short clauses identifying the most impactful gaps — what the PM/writer would need to add to raise the score by one band. Examples:
   - *"UI flow not described; edge cases missing"*
   - *"No numbered ACs, prose only"*
   - *"Roles/permissions implicit"*
   - If the issue is at 5/5, write *"None"*.

Per-issue scores are independent — do not let the combined assessment influence them.

---

## Combined readability — not an average

The combined readability score is **not** the average of per-issue scores. Sub-issues frequently complement an epic that is weak on its own; two issues at 2/5 can be coherent and clear together if their gaps cover for each other.

**Procedure:**

1. Re-read the corpus as a single text — target body, parent body, every sub-issue body, all relevant comments.
2. Grade the same five dimensions against the **union** of all issues. Each dimension is **✅ Present** if the information appears anywhere in the corpus, even if no single issue contains it.
3. Apply the 1–5 rubric to the dimension grades. Use the same tie-breakers.
4. Write a one-sentence rationale that names *why* the combined score differs from the per-issue scores, when it does. Examples:
   - *"Gaps in #90004 are covered by #90003's ACs when the set is read together."*
   - *"All sub-issues miss explicit scope; the epic does not fill that gap, so combined matches the weakest per-issue score."*
   - *"All issues are equally weak — combined matches the average."*

A combined score **higher** than every per-issue score is normal and expected when the set is well-organized. A combined score **lower** than the highest per-issue score should not happen and indicates a grading error to correct.

---

## Issue Coverage Ratio

This is the quantitative half of the assessment. Computed **after** all scenarios are written, just before the draft is saved.

**Definition:**

```
Coverage Ratio = scenarios_derivable_from_issue_text / total_scenarios
```

A scenario is **derivable from issue text** when:

- Every concrete fact in the Given / When / Then steps (UI element names, error messages, field names, telemetry events, feature flag names, role names, state transitions) is present in **at least one issue body or comment** in the corpus.
- The scenario's behaviour is traceable to a consolidated AC item that came from issue text — not from a PR description, PR diff, PR review comment, or code analysis.

A scenario is **not derivable from issue text** when:

- It exists because of an artifact discovered only in the PR (e.g. a new API endpoint introduced in the diff with no mention in any issue).
- A concrete fact in the Gherkin (error message wording, exact label text, telemetry field name, feature flag identifier) was sourced from the PR or the code, not from any issue body or comment.

### Boundary case: no PR linked

The classification reads as if a PR always exists. When the target issue has no linked or orphan PR (the feature is still spec-only, or the PR has not been opened yet), apply this rule:

| Source of a Gherkin fact | Classify as |
|---|---|
| Issue body, issue comment, sub-issue body, sub-issue comment, image/Figma/Google Docs linked from any of the above | `issue` |
| Existing source code (e.g. an artifact discovered by reading the codebase to anchor a regression test, an implementation detail like *"regex `lastIndex` is not retained"*) | `pr` (treated identically to PR-only facts) |
| Agent's pre-trained knowledge, web search, or speculation | Not allowed — every scenario fact must trace to one of the two rows above |

In other words: **PR and code are interchangeable for the Coverage Ratio**. The rubric treats them as the same category because both are "outside the issue corpus the PM/writer authored". This keeps the metric meaningful on plans generated before a PR exists.

### Why the rule is conservative

Scenarios written with PR-specific vocabulary (feature flag names, exact UI element names) count as `pr` even when the underlying behaviour traces fully to an issue AC. This is intentional:

| Tempting alternative | Why we don't do it |
|---|---|
| Abstract the Gherkin to issue-text vocabulary to lift the ratio | Loses precision — the test writer can no longer identify the exact artifact under test. |
| Weight scenarios by *"mostly issue, some PR"* | Hides PR sourcing; opens the door to hallucinated facts being silently included. |
| Drop the `pr` scenarios from the denominator | Falsifies the signal — the metric is meant to count what the issue text supports, not what the agent chose to write. |

**The signal points to the PM / writer**, not to the test writer. A low ratio means the issue lacks detail, not that the scenarios are wrong. Do not abstract the Gherkin to inflate the number.

**Procedure:**

1. Walk the finalized scenarios in the draft one by one.
2. For each scenario, classify its origin as `issue` or `pr` using the rules above. **`both` is not a category** — apply the conservative rule: if any concrete fact required the PR, classify as `pr`.
3. Count the `issue` scenarios and divide by the total scenarios in the draft (including those in the Pending work block, if any).
4. Express the result as `X / Y scenarios (Z%)`, with Z rounded to the nearest integer percent.
5. Write a one-sentence **breakdown** identifying the main categories of facts that required PR analysis. Examples:
   - *"…required PR analysis (mostly error message strings, telemetry field names, and feature flag identifiers)."*
   - *"…required PR analysis (entirely new API endpoints not mentioned in any issue)."*
   - If Z = 100%: *"All scenarios derivable from issue text — no PR-only facts."*

The ratio is **separate from** the 1–5 score and gives a number that does not depend on subjective grading.

---

## Stop-and-ask gate

**If the combined readability score is 1, stop and apply the Core rule.**

The combined-1 case means: even reading all issues together, there is not enough information to derive a test plan from the text. Continuing would produce a plan that is essentially fabricated from the PR or invented — exactly what the Core rule forbids.

**Message to the user:**

> ⚠️ Issue clarity check failed for issue #&lt;target&gt;. After reading the target issue, the parent epic, and every sub-issue, the combined readability score is **1/5** — the descriptions do not contain enough information to derive a test plan from the text alone.
>
> Most critical gaps across the set:
> - *[gap 1, e.g. no numbered acceptance criteria in any issue]*
> - *[gap 2, e.g. no scope boundary in target or parent]*
> - *[gap 3, e.g. UI completely undescribed]*
>
> How would you like to proceed?
>
> **A) Pause and improve the issues first** — I will stop here and you can return when the issues have been updated.
>
> **B) Continue anyway** — I will build the test plan primarily from the PR. The plan will rely heavily on PR content; the Coverage Ratio will likely be very low, and the published Issue Clarity Assessment will record the combined-1 grade as feedback for the PM/writer.
>
> **C) Cancel.**

If the user chooses **B**, continue with the rest of the workflow and let the published assessment carry the feedback signal. Do not lower or alter the combined-1 grade for the published assessment — it is the whole point of the check.

The gate triggers **only** on combined = 1. Per-issue scores of 1 on individual sub-issues do not trigger it on their own, since other issues in the set may compensate.

---

## Output format

The assessment is rendered both in the chat (immediately after the draft is saved) and as a collapsible section at the end of the test plan that is published in the GitHub comment.

The canonical markdown template is defined in [`output-formats.md`](output-formats.md#issue-clarity-assessment-section). It looks like this when rendered (numbers are synthetic for illustration — do not match any real Kibana issue):

```markdown
<details>
<summary>📊 Issue Clarity Assessment</summary>

| Issue | Type | Score | Critical gaps |
|---|---|---|---|
| #90001 (target) | Epic | 3/5 | UI flow not described; edge cases missing |
| #90002 (parent) | Parent epic | 4/5 | Roles/permissions implicit |
| #90003 (sub) | Sub-issue | 4/5 | None |
| #90004 (sub) | Sub-issue | 2/5 | No numbered ACs, prose only |

**Combined readability: 4/5** — Gaps in #90004 are covered by #90003's ACs when the set is read together.

**Issue Coverage Ratio: 38 / 61 scenarios (62%)** are derivable from issue text alone. The remaining 23 required PR analysis (mostly error message strings, telemetry field names, and feature flag identifiers).

**Actionable feedback:**
- Issue #90004 should add numbered ACs before the next sprint.
- All sub-issues would benefit from listing edge cases and error states explicitly.

</details>
```

**Rules:**
- One row per issue read in Step 1 — do not skip any, even those that scored 5/5.
- The `Type` column uses one of: `Target`, `Parent epic`, `Sub-issue`. When the target issue is itself an epic, use `Epic` instead of `Target`.
- `Critical gaps` is `None` when the score is 5/5, otherwise a 1–2 clause note.
- The **Actionable feedback** bullet list is included only when at least one issue scored ≤ 3 or the Coverage Ratio is below 60%. Otherwise omit it.
- Wrap the whole block in `<details><summary>📊 Issue Clarity Assessment</summary>…</details>` so it appears collapsed in the GitHub comment by default.

---

## Worked example — well-organized epic

Synthetic numbers for illustration — do not match any real Kibana issue.

For a fictional epic `#90001` about ES|QL inline UDFs with one parent and two sub-issues, the assessment might look like this:

| Issue | Acceptance Criteria | Scope | UX/UI | Data & Roles | Edge cases | Score | Gaps |
|---|---|---|---|---|---|---|---|
| #90001 (target, epic) | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | 3 | UI flow not described; edge cases missing |
| #90002 (parent) | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | 4 | Roles/permissions implicit |
| #90003 (sub) | ✅ | ✅ | N/A (API change) | ✅ | ⚠️ | 4 | None significant |
| #90004 (sub) | ❌ | ⚠️ | N/A (API change) | ⚠️ | ❌ | 2 | No numbered ACs, prose only |

Combined readability evaluation, re-reading the corpus as a single text:

| Dimension | Combined grade | Why |
|---|---|---|
| Acceptance Criteria | ✅ | Numbered ACs in #90001 cover #90004's gap |
| Scope | ✅ | Target and parent both explicit |
| UX/UI | ✅ | Parent #90002 has Figma node |
| Data & Roles | ⚠️ | Mentioned but not enumerated by role anywhere |
| Edge cases | ⚠️ | A few mentioned in #90003, none in others |

→ Combined readability: **4/5** (two ⚠️ Partial, three ✅; passes the 4-band rule with one ⚠️ tolerance).

Coverage Ratio computed at the end of Step 3: of 61 final scenarios, 38 were derivable from issue text alone (62%). The 23 PR-only scenarios broke down mostly into UI label text and telemetry field names not in any issue.

---

## Worked example — combined=1 case

Synthetic numbers for illustration — do not match any real Kibana issue.

A catastrophic case where the corpus is too thin to derive a test plan from text alone. Demonstrates the stop-and-ask gate firing.

**Corpus:**

| Source | Content |
|---|---|
| Target `#90010` (epic) | Title + one paragraph: *"Add support for X integration. The feature should work as expected and feel native."* No ACs, no scope, no UI, no edge cases. |
| Parent `#90011` (epic) | Empty body. |
| Sub-issue `#90012` | Prose paragraph describing a use case but no enumerable behaviours. |

**Per-issue grades:**

| Issue | Acceptance Criteria | Scope | UX/UI | Data & Roles | Edge cases | Score | Gaps |
|---|---|---|---|---|---|---|---|
| #90010 (target, epic) | ❌ | ❌ | ❌ | ❌ | ❌ | 1 | No ACs, no scope, no UI, no data/roles, no edge cases — tie-breaker: AC ❌ + Scope ❌ → 1 |
| #90011 (parent) | ❌ | ❌ | ❌ | ❌ | ❌ | 1 | Empty body — same tie-breaker |
| #90012 (sub) | ❌ | ❌ | ❌ | ⚠️ | ❌ | 1 | Prose only — same tie-breaker |

**Combined readability:**

| Dimension | Combined grade | Why |
|---|---|---|
| Acceptance Criteria | ❌ | Not present anywhere in the corpus |
| Scope | ❌ | Not present anywhere in the corpus |
| UX/UI | ❌ | Not present anywhere in the corpus |
| Data & Roles | ⚠️ | Sub-issue prose vaguely implies a user role; not enumerated |
| Edge cases | ❌ | Not present anywhere in the corpus |

→ Combined readability: **1/5** (four ❌ + one ⚠️; tie-breaker AC ❌ + Scope ❌ → 1). **Stop-and-ask gate fires.**

**Message rendered to the user:**

> ⚠️ Issue clarity check failed for issue #90010. After reading the target issue, the parent epic, and every sub-issue, the combined readability score is **1/5** — the descriptions do not contain enough information to derive a test plan from the text alone.
>
> Most critical gaps across the set:
> - No acceptance criteria in any issue (target, parent, or sub-issue)
> - No scope boundary defined anywhere
> - UI is completely undescribed
>
> How would you like to proceed?
>
> **A) Pause and improve the issues first** — I will stop here and you can return when the issues have been updated.
>
> **B) Continue anyway** — I will build the test plan primarily from the PR. The plan will rely heavily on PR content; the Coverage Ratio will likely be very low, and the published Issue Clarity Assessment will record the combined-1 grade as feedback for the PM/writer.
>
> **C) Cancel.**

If the user chooses **B**, the published assessment carries the combined=1 grade verbatim — do not lower or alter it. The grade is the signal.
