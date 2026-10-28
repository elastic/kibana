# Update / Regenerate Workflow

Follow these steps when the user asks to `update` or `regenerate` a test plan and a published comment exists (body starting with `<!-- test-plan-generated -->`).

If no published comment exists, skip all steps here and run Steps 1–3 from SKILL.md as a full draft fallback.

---

1. **Fetch the published comment** and store its `updatedAt` as `PLAN_PUBLISHED_AT`.
   ```
   gh issue view <number> --repo <owner>/<repo> --json comments
   ```
   From the returned comments array, find the one whose body starts with `<!-- test-plan-generated -->` and store its `updatedAt` field.

   **Also parse the published body** and build a map keyed by *scenario title within feature area* called `PUBLISHED_EXECUTION_STATE`:
   - For each `#### Scenario:` heading, capture the scenario title from the heading and the contents of the ```` ```gherkin … ``` ```` block that belongs to that scenario. Per the canonical *Scenario format* in [`output-formats.md`](output-formats.md#scenario-format), the gherkin fence is **not** adjacent to the heading — `**Priority:**` (and `**Source:**` under `detailed`) and `**Automation coverage**:` fields appear between them. Skip past those fields when locating the gherkin block; the scenario boundary ends at the next `#### Scenario:` heading or at the end of the enclosing feature-area collapsible.
   - For each scenario, capture the verbatim state of its canonical `Execution:` block if present (the three checkbox lines and any preceding `_Scenario updated on …_` callout). Recognise the canonical shape only — non-canonical blocks or scenarios without one are flagged as **no published state** (the published plan was generated before the Execution block was introduced, or the comment was edited externally to drop the block).

   This map is consumed by the *Execution block preservation* sub-step in step 6.

   **Resolve `VERBOSITY_LEVEL` for this run** with the resolver script. Pass `--keyword` only when `INVOCATION_VERBOSITY_KEYWORD` (from [`../SKILL.md` § Modes of operation](../SKILL.md#modes-of-operation)) is set:

   ```bash
   x-pack/solutions/security/plugins/security_solution/.agents/skills/test-plan-generator/scripts/resolve_verbosity.sh \
     [--repo <owner>/<repo>] [--keyword <lean|standard|detailed>] <issue_number>
   ```

   It prints five `KEY=value` lines. Store each value under the same name and do not recompute them by hand. If `gh` is unavailable, save the published body fetched above to a file under `.agents/tmp/` and pass `--body-file <file>` instead of the issue number.

   | Value | Meaning |
   |---|---|
   | `PUBLISHED_VERBOSITY_LEVEL` | Level in the published `<!-- verbosity: … -->` marker, or `none` when the plan predates the marker. |
   | `VERBOSITY_LEVEL` | Level for this run: the keyword, else the published marker, else `standard`. |
   | `BASELINE_VERBOSITY_LEVEL` | Level the published plan is rendered at: the published level, or `standard` when the marker is missing — older plans have the shape `standard` keeps today. |
   | `VMIG` | `true` when the marker is missing. Append the entry `Vmig` to `SKILL_RULE_MIGRATIONS` (see Step 5) with the description *"published plan had no `<!-- verbosity: … -->` marker; added `<!-- verbosity: <VERBOSITY_LEVEL> -->`."* `Vmig` only records the missing marker; it is not a level change. |
   | `LEVEL_CHANGED` | `true` when `VERBOSITY_LEVEL != BASELINE_VERBOSITY_LEVEL`. A legacy plan updated without a keyword gives `VMIG=true` and `LEVEL_CHANGED=false`; `update a lean test plan …` on the same plan gives `true` for both. |

   A level change is an identified change (Step 5); Step 6 defines which parts are re-rendered. Scenario titles, Gherkin blocks, scenario count, priorities, and ⚠️ entries stay identical (see [`output-formats.md` § Verbosity levels](output-formats.md#verbosity-levels)).

2. **Re-fetch all non-PR GitHub sources** — the issue, sub-issues, comments, and the parent issue (if any). Use the exact `gh` commands for each source type defined in [`gathering-context.md`](gathering-context.md) (*GitHub fetches*, *Parent issue*, *Sub-issues*, *Acceptance criterion extraction and origin tagging*). The *one level up only* and *background context only* constraints from the [Parent issue](gathering-context.md#parent-issue) section still apply.

   **Re-apply URL categorization** to all re-fetched content (issue body, comments, sub-issues, parent). For each URL not already present in the published plan: categorize per the [URL categorization](gathering-context.md#url-categorization) table and fetch via the matching section (Images, Figma, Google Docs, Linked GitHub issues). New images, Figma nodes, or Google Docs added since publication must be analyzed before continuing — silently skipping them is the most common update-mode regression.

   Re-build the **flat acceptance criteria list** (with `issue` / `pr` / `both` origin tags per AC) and the **consolidated AC list** from the re-fetched content, as described in the [*Acceptance criterion extraction and origin tagging*](gathering-context.md#acceptance-criterion-extraction-and-origin-tagging) section of `gathering-context.md` and Step 2 of SKILL.md. The list must include the **target issue** in addition to every sub-issue, parent, and linked issue — not only sub-issues.

   **Re-run Step 1.5 — Issue Clarity Assessment (first half)** on the refreshed corpus, even if no descriptions appear to have changed. The published assessment may be stale; re-scoring the per-issue and combined scores against the current text is the only way to confirm. Follow [`issue-clarity-assessment.md`](issue-clarity-assessment.md) end-to-end up to and including the stop-and-ask gate. If combined readability is now **1**, apply the gate before continuing — do not silently override a previously higher published score.

3. **Check PR activity.** Find all PR numbers linked to the issue — look in the issue body, the issue comments, and the published test plan. For each, fetch only the update timestamp:
   ```
   gh pr view <number> --repo <owner>/<repo> --json number,title,updatedAt
   ```
   Compare each PR's `updatedAt` against `PLAN_PUBLISHED_AT`. Build two lists: **re-read** (newer than `PLAN_PUBLISHED_AT`) and **skip** (same or older). If the user said "including PRs", mark all PRs as re-read regardless of timestamp.

   **Also mark all PRs as re-read when the new level needs data the published plan does not hold.** The test coverage catalog and the PR artifacts inventory are not kept between sessions, so for a skipped PR the published plan is the only record. A `lean` plan keeps only test counts, not test names or paths, and only a `detailed` plan keeps `**Source:**` citations of PR artifacts. Therefore re-read all PRs when:
   - `BASELINE_VERBOSITY_LEVEL` is `lean` and `VERBOSITY_LEVEL` is `standard` or `detailed` — the itemised `**Automation coverage**:` lines need the full catalog;
   - `VERBOSITY_LEVEL` is `detailed` and `BASELINE_VERBOSITY_LEVEL` is not — the `**Source:**` lines need the PR artifacts inventory.

   If either case applies and the plan has **no linked PR** (the backend / parser case in [`example-test-plan-backend.md`](example-test-plan-backend.md)), there is nothing to re-read, so gather the same data from the code:
   - **First case** — run the filesystem test search from the *If a PR has no test files* list in [`gathering-context.md`](gathering-context.md#pull-requests-and-test-coverage) against the feature area and the source files the published plan cites, and use its results as the test coverage catalog for Step 6.
   - **Second case** — re-read the source files the published plan cites, so every `Code-derived (…)` `**Source:**` line points at a fact you have verified in this session. Without this, a code-derived scenario has no traceable source and halts on the Core rule.

   Moving to a less detailed level needs no extra re-read; the published plan already holds everything the new level renders.

4. **Re-read updated PRs.** For each PR in the re-read list, fetch the full content — description, review comments, and diff — applying the rules defined in the [*Pull requests and test coverage*](gathering-context.md#pull-requests-and-test-coverage) section of `gathering-context.md` (max 20 files per PR, 500-line file diff cap, the always-skip list including `*.gen.ts` / `*.gen.tsx`, image fetching extended to PR bodies and review comments). Update the test coverage catalog and the PR artifacts inventory. If a re-read PR has no test files, apply the filesystem search described in that same section using [`security-test-directories.md`](security-test-directories.md).

5. **Compare all sources against the published comment and identify:**
   - New acceptance criteria not covered by any existing scenario.
   - Existing scenarios now incorrect due to changes in the issue or PRs.
   - Sections referencing outdated information (wrong URLs, feature flag names, milestones).
   - Known Limitations that have been resolved or new ones that have emerged.
   - New test files that should be reflected in automation coverage lines.
   - New PR artifacts (API routes, service methods, saved object types, schemas, UI components, feature flags) introduced by re-read PRs that are not covered by any existing scenario.
   - **Sub-issues previously listed in the *Pending work* collapsible block that have now been implemented** — see the special handling in Step 6.
   - **A changed Issue Clarity Assessment** — per-issue scores, combined readability, or *critical gaps* notes differ from the assessment block in the published comment. A score change alone is enough reason to save a refreshed draft so the published assessment is not stale.
   - **Legacy scenarios with no canonical Execution block** — when `PUBLISHED_EXECUTION_STATE` (built in step 1) flags one or more scenarios as *no published state*, the plan must be re-saved to inject the empty blocks so devs can record execution status going forward. The injection is handled by *Execution block preservation* in Step 6, and the migration count is announced via `legacy_migrations` in Step 7. This trigger fires even when the underlying issue/PR content is unchanged — without it, a published plan could remain permanently without checkboxes.
   - **Verbosity level changed** — when `LEVEL_CHANGED` is `true` (Step 1), the level-dependent parts listed in Step 6 are re-rendered at the new level and the plan is re-saved. Announced via Step 7's level-change line. A missing marker alone is not a level change — it is the `Vmig` migration below.
   - **Published plan violates the current draft coherence review** — run every check in [`draft-coherence-review.md`](draft-coherence-review.md) (S1–S8 source-fidelity and D1–D9 whole-document) against the **published plan** as if it were the assembled draft. Any `⚠️` or `❌` produced is a **skill-rule compliance gap** and forces saving a refreshed draft, even when the content sources are unchanged. This is the generic escape hatch that fires whenever a skill rule is introduced or tightened after the plan was published — for example the *Always-evaluated coverage* rule (upgrade / CRUD / dependency scenarios), dynamic upgrade source versions resolved from `versions.json`, or any future rule added to `draft-coherence-review.md`. It exists so new skill rules automatically propagate to previously published plans without needing a dedicated trigger per rule. Store the failing check IDs and a one-line description of each in a `SKILL_RULE_MIGRATIONS` list — the fixes are applied in Step 6's special handling, the list is emitted via `SKILL_RULE_MIGRATIONS` in Step 7. `Vmig` (published plan missing `<!-- verbosity: … -->` marker; see Step 1) is one such migration and is appended to this list at Step 1 time; the remedy is to emit the marker at draft-save (naturally handled in Step 6). Because `Vmig` is in this list, a legacy plan is always re-saved once, even when nothing else changed.

   **If this comparison produces an empty change list** (no new ACs, no incorrect scenarios, no outdated sections, no new/resolved limitations, no new test files or PR artifacts, no implemented Pending sub-issues, no change to the Issue Clarity Assessment, no scenarios in `PUBLISHED_EXECUTION_STATE` flagged as *no published state*, no verbosity level change, **and** no failing checks in `SKILL_RULE_MIGRATIONS`): skip Steps 6 and 7, do not save a draft, and tell the user *"The existing test plan for issue #&lt;number&gt; appears to be up to date — no draft saved."* Then jump directly to Step 8 and output the Sources Summary so the user can see what was checked.

6. **Apply only the identified changes.** Do not rewrite accurate sections — **with one exception: when `LEVEL_CHANGED` is `true` (Step 1), re-render the level-dependent parts listed in *Render sections at `VERBOSITY_LEVEL`* below, even if their sources are unchanged.**

   **Special handling: implemented Pending sub-issues** (per the *Pending work pattern* in [`document-structure.md`](document-structure.md)):
   - Remove the `(Pending #N)` prefix from each AC item and from the matching scenario title.
   - Move each affected scenario from the *Pending work* collapsible block into its proper feature area section, placed in priority order (P0 → P1 → P2).
   - Decrease the *Pending work* row in the Test Coverage Summary by the number of migrated scenarios, and increase the affected feature area rows accordingly. Reclassify the migrated scenarios in the `Automated` / `Manual only` columns based on whether matching tests exist in the catalog.
   - If the *Pending work* row would reach `0`, remove the row, the collapsible block, and the related `⚠️` entry in Known Limitations.

   If new scenarios must be written, follow the [Writing scenarios](../SKILL.md#writing-scenarios) procedures from Step 3 of SKILL.md.

   **Special handling: skill-rule migrations.** If `SKILL_RULE_MIGRATIONS` (from Step 5) is non-empty, treat each failing check as an identified change and apply its remedy on the updated draft. The remedy for every check ID is documented in the *What to verify* / *Common failure* columns of the two tables in [`draft-coherence-review.md`](draft-coherence-review.md) — read the row for the failing check ID and fix the draft accordingly. Examples: `S6a` missing upgrade coverage → add the Upgrade scenarios template from [`optional-scenarios.md`](optional-scenarios.md#upgrade-scenarios), or add an *Out of scope* bullet with a one-clause reason; `S6b` stale hardcoded upgrade versions → resolve fresh values via the placeholder rules in [`optional-scenarios.md`](optional-scenarios.md#upgrade-scenarios) and replace them. Do **not** rewrite sections that are not flagged — the migration is scoped to the failing checks only. **Exception:** `Vmig` (the synthetic marker migration appended in Step 1 for plans missing `<!-- verbosity: … -->`) has no row in `draft-coherence-review.md`; its remedy is automatic — the *Compute the token usage marker, then save the updated draft* sub-step below always prepends the verbosity marker at draft-save time. `Vmig` alone re-renders nothing. It is announced with the other `SKILL_RULE_MIGRATIONS` in Step 7, separately from the level-change line.

   **Execution block preservation.** Each emitted scenario must carry the canonical `Execution:` block (defined in [`output-formats.md`](output-formats.md#scenario-format)). Apply the **preserve-on-match** strategy when populating it, using the `PUBLISHED_EXECUTION_STATE` map from step 1:

   | Scenario state in updated draft | Match in `PUBLISHED_EXECUTION_STATE` | Behavior |
   |---|---|---|
   | Title + Gherkin unchanged | Canonical block present | Carry over the three checkbox lines verbatim. Preserve any existing `_Scenario updated on …_` callout. |
   | Title + Gherkin unchanged | No published state (legacy plan or non-canonical block) | Initialize an empty `Execution` block with all three boxes unchecked. **No callout.** Increment a `legacy_migrations` counter for the post-save announcement in step 7. |
   | Title preserved, Gherkin substantively changed | Any | Reset all three checkboxes to unchecked **and** insert the callout `_Scenario updated on YYYY-MM-DD, please re-execute_` immediately above the three checkboxes. |
   | Scenario new (no title match) | n/a | Empty `Execution` block, all unchecked, no callout. |
   | Scenario removed (matched scenario dropped from updated draft) | n/a | Drop. The execution history lives in GitHub's comment edit log. |

   **Matching rule.** Match by scenario title within feature area — already required to be unique by [`common-mistakes.md`](common-mistakes.md) § *Redundant scenarios*. If a title-match is found but the feature area changed, treat as **changed** (row 3) rather than new — the scenario was relocated, not re-authored.

   **"Substantively changed" definition.** A Gherkin block is substantively changed when one or more of: a step was added or removed; a `Given`/`When`/`Then`/`And` keyword changed; or a step's natural-language text changed in a way that alters the assertion. Pure whitespace, capitalisation, or punctuation changes do not count — leave the checkboxes alone.

   **Date format.** Use `YYYY-MM-DD` for the callout — same format as the document footer.

   **Self-review applies to the full updated document, not just the changes.** Run the Gherkin self-review and the three mechanical sum-checks from [`output-formats.md`](output-formats.md) against the entire updated draft, re-review [`common-mistakes.md`](common-mistakes.md), and re-run the [draft coherence review](draft-coherence-review.md) end-to-end against the full updated document. Updates frequently introduce internal contradictions — a *Scope* bullet kept from the previous version that no longer matches the refreshed scenarios, a *Known Limitations* `⚠️` whose source is now accessible, or a Pending-work block that was not fully migrated. Verify Test Coverage Summary totals column-wise and row-wise explicitly.

   **Re-run Step 3.5 — Issue Clarity Assessment (second half)** on the updated draft. The per-issue scores and combined readability **from the Step 1.5 re-run performed within step 2 above** are reused as-is (step 2 itself is the re-fetch; it does not produce scores — the scores come from the Step 1.5 re-run it invokes). The Coverage Ratio must be recomputed because the scenario count and per-scenario origins may have changed. Assemble the refreshed assessment block per [`output-formats.md`](output-formats.md#issue-clarity-assessment-section) and replace the existing assessment section in the draft — do not append a second one.

   **Render sections at `VERBOSITY_LEVEL`.** All prose sections (`Overview`, `Feature Background`, `Assumptions`) and per-scenario metadata (`Automation coverage` line, `Source` line under `detailed`) must be emitted at the level resolved in Step 1. When `LEVEL_CHANGED` is `true`, every section that changes shape at the new level is re-rendered — even if its underlying content sources are unchanged. Non-negotiable invariants (scenario count, priorities, ⚠️ entries, *Out of scope* reasons) remain identical to the published plan except where the change list in Step 5 forced them to move. See [`output-formats.md` § Verbosity levels](output-formats.md#verbosity-levels).

   **Compute the token usage marker, then save the updated draft.** Invoke the token usage script:

   ```bash
   python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py
   ```

   If the script exits 0, capture its output — space-separated `input=… output=… cache_create=… cache_read=… total=…` — as `TOKEN_LINE`. If it exits non-zero, leave `TOKEN_LINE` unset and skip the tokens marker. Then save to `x-pack/solutions/security/plugins/security_solution/.agents/tmp/test-plan-#<issue_number>.md`, overwriting any existing draft at that path. This save is unconditional — it applies whether the changes involved new scenarios, edits to existing scenarios, Pending-work migrations, an assessment refresh, a verbosity-level change, or only metadata updates. Drop the top markers carried over from the published comment (`<!-- test-plan-generated -->`, `<!-- generated-by: … -->`, `<!-- verbosity: … -->`, `<!-- tokens: … -->`), then put these markers at the top of the file (Step 4's publish script writes the final marker order and refuses a draft with duplicated markers):
   - `<!-- verbosity: <VERBOSITY_LEVEL> -->` — **always emitted**, using the value resolved in Step 1.
   - `<!-- tokens: input=X output=Y cache_create=W cache_read=Z total=T -->` — **only if `TOKEN_LINE` was captured**.

   Both markers always reflect the run that produced the current comment. The publish step will PATCH the existing GitHub comment with this file's contents. Skip the Sources Summary sub-step inside [Saving the draft](../SKILL.md#saving-the-draft) — the update-mode version with PR re-read info is emitted in step 8 below. See [`output-formats.md` § Verbosity levels](output-formats.md#verbosity-levels) and [`output-formats.md` § Token usage marker](output-formats.md#token-usage-marker) for the marker specs and the fallback rules.

7. Replace Step 3's generic *"Draft saved…"* message: tell the user exactly what changed and what was left unchanged. If any Issue Clarity Assessment scores or Coverage Ratio changed, explicitly call that out — e.g. *"Combined readability moved from 3/5 to 4/5 after #16938 was rewritten with numbered ACs; Coverage Ratio rose from 62% to 78%."*

   **If `LEVEL_CHANGED` is `true`** (the user requested a level different from the published one — for a legacy plan without a marker, different from `standard`), announce the change on its own line:

   > *Verbosity level changed from `<BASELINE_VERBOSITY_LEVEL>` to `<VERBOSITY_LEVEL>` — re-rendered `Overview`, `Feature Background`, `Assumptions`, and the per-scenario metadata lines at the new level. Scenario titles, Gherkin, priorities, and ⚠️ entries are unchanged (see [`output-formats.md` § Verbosity levels](output-formats.md#verbosity-levels) non-negotiable constraint).*

   This line is independent of `Vmig`: `Vmig` says the missing marker was added and is announced with the `SKILL_RULE_MIGRATIONS` below; this line says sections were re-rendered. A legacy plan updated without a keyword gets only the `Vmig` announcement; a legacy plan updated with a different level keyword gets both.

   **If `legacy_migrations` > 0** (one or more scenarios had no canonical `Execution` block in the published comment — applies to plans published before the Execution block was introduced, or to comments edited externally to drop the block), explicitly tell the user how many: *"Migrated N legacy scenarios — added empty Execution blocks; please re-execute and mark Pass/Fail/Blocked when done."* Do not bury this in the generic message; it is the only signal devs get that the next checkbox click starts fresh state, not appended to prior runs.

   **If `SKILL_RULE_MIGRATIONS` is non-empty** (the published plan violated one or more current skill rules — see the *Published plan violates the current draft coherence review* trigger in Step 5), announce them explicitly grouped by check ID. Example: *"Migrated 2 sections to current skill rules — one under S6a: added missing Upgrade coverage (feature ships an SO type change); one under S6b: refreshed stale source versions to 8.19.19 → 9.6 and 9.5.0 → 9.6 per current `versions.json`. The published plan was generated before these rules were introduced; please re-review the migrated sections."* Do not bury this in the generic message; devs need to know which sections changed for reasons other than issue/PR content updates.

8. Output the Sources Summary as defined in [`output-formats.md`](output-formats.md). Include one row per linked PR showing whether it was re-read or skipped. **Render the refreshed Issue Clarity Assessment block in the chat after the Sources Summary**, identical to the one written into the draft. **Then render the token usage line.** If `TOKEN_LINE` was captured in Step 6, reuse it. **If Step 5's empty-change-list branch jumped here directly** (Steps 6 and 7 were skipped and `TOKEN_LINE` is unset), invoke the script standalone here to capture it — the check itself has a token cost worth reporting:

   ```bash
   python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py
   ```

   On success emit `**Token usage:** input=X, output=Y, cache_create=W, cache_read=Z, **total=T**` (commas between fields, bold label and total); on failure emit `**Token usage:** not available for this session`. Never substitute `total=0`. See [`output-formats.md`](output-formats.md#token-usage-marker) for the exact format.
