# Update / Regenerate Workflow

Follow these steps when the user asks to `update` or `regenerate` a test plan and a published comment exists (body starting with `<!-- test-plan-generated -->`).

If no published comment exists, skip all steps here and run Steps 1–3 from SKILL.md as a full draft fallback.

---

1. **Fetch the published comment** and store its `updatedAt` as `PLAN_PUBLISHED_AT`.
   ```
   gh issue view <number> --repo <owner>/<repo> --json comments
   ```
   From the returned comments array, find the one whose body starts with `<!-- test-plan-generated -->` and store its `updatedAt` field.

2. **Re-fetch all non-PR GitHub sources** — the issue, sub-issues, comments, and the parent issue (if any). Use the exact `gh` commands for each source type defined in [`gathering-context.md`](gathering-context.md) (*GitHub fetches*, *Parent issue*, *Sub-issues*). The *one level up only* and *background context only* constraints from the [Parent issue](gathering-context.md#parent-issue) section still apply.

   **Re-apply URL categorization** to all re-fetched content (issue body, comments, sub-issues, parent). For each URL not already present in the published plan: categorize per the [URL categorization](gathering-context.md#url-categorization) table and fetch via the matching section (Images, Figma, Google Docs, Linked GitHub issues). New images, Figma nodes, or Google Docs added since publication must be analyzed before continuing — silently skipping them is the most common update-mode regression.

   Build the **flat acceptance criteria list** and the **consolidated AC list** from the re-fetched content, as described in the *Sub-issues* section of [`gathering-context.md`](gathering-context.md) and Step 2 of SKILL.md.

3. **Check PR activity.** Find all PR numbers linked to the issue — look in the issue body, the issue comments, and the published test plan. For each, fetch only the update timestamp:
   ```
   gh pr view <number> --repo <owner>/<repo> --json number,title,updatedAt
   ```
   Compare each PR's `updatedAt` against `PLAN_PUBLISHED_AT`. Build two lists: **re-read** (newer than `PLAN_PUBLISHED_AT`) and **skip** (same or older). If the user said "including PRs", mark all PRs as re-read regardless of timestamp.

4. **Re-read updated PRs.** For each PR in the re-read list, fetch the full content — description, review comments, and diff — applying the rules defined in the [*Pull requests and test coverage*](gathering-context.md#pull-requests-and-test-coverage) section of `gathering-context.md` (max 20 files per PR, 500-line file diff cap, the always-skip list including `*.gen.ts` / `*.gen.tsx`, image fetching extended to PR bodies and review comments). Update the test coverage catalog and the PR artifacts inventory. If a re-read PR has no test files, apply the filesystem search described in that same section using [`security-test-directories.md`](security-test-directories.md).

5. **Compare all sources against the published comment and identify:**
   - New acceptance criteria not covered by any existing scenario.
   - Existing scenarios now incorrect due to changes in the issue or PRs.
   - Sections referencing outdated information (wrong URLs, feature flag names, milestones).
   - Known Limitations that have been resolved or new ones that have emerged.
   - New test files that should be reflected in automation coverage lines.
   - New PR artifacts (API routes, service methods, saved object types, schemas, UI components, feature flags) introduced by re-read PRs that are not covered by any existing scenario.
   - **Sub-issues previously listed in the *Pending work* collapsible block that have now been implemented** — see the special handling in Step 6.

6. **Apply only the identified changes.** Do not rewrite accurate sections.

   **Special handling: implemented Pending sub-issues** (per the *Pending work pattern* in [`document-structure.md`](document-structure.md)):
   - Remove the `(Pending #N)` prefix from each AC item and from the matching scenario title.
   - Move each affected scenario from the *Pending work* collapsible block into its proper feature area section, placed in priority order (P0 → P1 → P2).
   - Decrease the *Pending work* row in the Test Coverage Summary by the number of migrated scenarios, and increase the affected feature area rows accordingly. Reclassify the migrated scenarios in the `Automated` / `Manual only` columns based on whether matching tests exist in the catalog.
   - If the *Pending work* row would reach `0`, remove the row, the collapsible block, and the related `⚠️` entry in Known Limitations.

   If new scenarios must be written, follow the [Writing scenarios](../SKILL.md#writing-scenarios) and [Saving the draft](../SKILL.md#saving-the-draft) procedures from Step 3 of SKILL.md — skip the Sources Summary sub-step there (the update-mode version with PR re-read info is emitted in step 8 below).

   **Self-review applies to the full updated document, not just the changes.** Before saving, run the Gherkin self-review and the three mechanical sum-checks from [`output-formats.md`](output-formats.md) against the entire updated draft, and re-review [`common-mistakes.md`](common-mistakes.md). Updates that recompute Test Coverage Summary totals incorrectly are the most common quality regression — verify column-wise and row-wise sums explicitly.

7. Replace Step 3's generic *"Draft saved…"* message: tell the user exactly what changed and what was left unchanged.

8. Output the Sources Summary as defined in [`output-formats.md`](output-formats.md). Include one row per linked PR showing whether it was re-read or skipped.
