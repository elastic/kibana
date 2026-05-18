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
- [The 1–5 rubric](#the-15-rubric)
- [Per-issue score procedure](#per-issue-score-procedure)
- [Combined readability — not an average](#combined-readability--not-an-average)
- [Issue Coverage Ratio](#issue-coverage-ratio)
- [Stop-and-ask gate](#stop-and-ask-gate)
- [Output format](#output-format)
- [Worked example](#worked-example)

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
| **Data & Roles** | Are pre-conditions, fixture data, user roles, RBAC requirements, and license level stated? | License/role/data are explicitly the same as the rest of the feature area and no exceptions apply. |
| **Edge cases** | Are negative paths, error handling, limits, and edge conditions mentioned (even briefly)? Is there a "what should NOT happen" anywhere in the text? | Never N/A — even trivial changes have edge cases. Mark **❌ Missing** rather than N/A when nothing is mentioned. |

**Marking N/A is a judgement call.** When in doubt, mark **❌ Missing** rather than N/A — N/A removes the dimension from the score and biases it upward.

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
   - *"Gaps in #16938 are covered by #16937's ACs when the set is read together."*
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

The canonical markdown template is defined in [`output-formats.md`](output-formats.md#issue-clarity-assessment-section). It looks like this when rendered:

```markdown
<details>
<summary>📊 Issue Clarity Assessment</summary>

| Issue | Type | Score | Critical gaps |
|---|---|---|---|
| #16898 (target) | Epic | 3/5 | UI flow not described; edge cases missing |
| #16797 (parent) | Parent epic | 4/5 | Roles/permissions implicit |
| #16937 (sub) | Sub-issue | 4/5 | None |
| #16938 (sub) | Sub-issue | 2/5 | No numbered ACs, prose only |

**Combined readability: 4/5** — Gaps in #16938 are covered by #16937's ACs when the set is read together.

**Issue Coverage Ratio: 38 / 61 scenarios (62%)** are derivable from issue text alone. The remaining 23 required PR analysis (mostly error message strings, telemetry field names, and feature flag identifiers).

**Actionable feedback:**
- Issue #16938 should add numbered ACs before the next sprint.
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

## Worked example

For a fictional epic #16898 about ES|QL inline UDFs with three sub-issues, the assessment might look like this:

| Issue | Acceptance Criteria | Scope | UX/UI | Data & Roles | Edge cases | Score | Gaps |
|---|---|---|---|---|---|---|---|
| #16898 (target, epic) | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | 3 | UI flow not described; edge cases missing |
| #16797 (parent) | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | 4 | Roles/permissions implicit |
| #16937 (sub) | ✅ | ✅ | N/A (API change) | ✅ | ⚠️ | 4 | None significant |
| #16938 (sub) | ❌ | ⚠️ | N/A (API change) | ⚠️ | ❌ | 2 | No numbered ACs, prose only |

Combined readability evaluation, re-reading the corpus as a single text:

| Dimension | Combined grade | Why |
|---|---|---|
| Acceptance Criteria | ✅ | Numbered ACs in #16898 cover #16938's gap |
| Scope | ✅ | Target and parent both explicit |
| UX/UI | ✅ | Parent #16797 has Figma node |
| Data & Roles | ⚠️ | Mentioned but not enumerated by role anywhere |
| Edge cases | ⚠️ | A few mentioned in #16937, none in others |

→ Combined readability: **4/5** (two ⚠️ Partial, three ✅; passes the 4-band rule with one ⚠️ tolerance).

Coverage Ratio computed at the end of Step 3: of 61 final scenarios, 38 were derivable from issue text alone (62%). The 23 PR-only scenarios broke down mostly into UI label text and telemetry field names not in any issue.
