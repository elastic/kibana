# Update / Regenerate Workflow

Follow these steps when the user asks to `update` or `regenerate` a test plan and a published comment exists (body starting with `<!-- test-plan-generated -->`).

If no published comment exists, skip all steps here and run Steps 1–3 from SKILL.md as a full draft fallback.

---

1. Fetch the published comment and store its `updatedAt` as `PLAN_PUBLISHED_AT`.
   ```
   gh issue view <number> --repo <owner>/<repo> --json comments
   ```
   From the returned comments array, find the one whose body starts with `<!-- test-plan-generated -->` and store its `updatedAt` field.

2. Re-fetch the issue body, all sub-issues, and all comments. While reading sub-issues, build the **flat acceptance criteria list** and then the **consolidated AC list** as described in Steps 1–2 of SKILL.md.

3. **Check PR activity.** Find all PR numbers linked to the issue — look in the issue body, the issue comments, and the published test plan. For each, fetch only the update timestamp:
   ```
   gh pr view <number> --repo <owner>/<repo> --json number,title,updatedAt
   ```
   Compare each PR's `updatedAt` against `PLAN_PUBLISHED_AT`. Build two lists: **re-read** (newer than `PLAN_PUBLISHED_AT`) and **skip** (same or older). If the user said "including PRs", mark all PRs as re-read regardless of timestamp.

4. **Re-read updated PRs.** For each PR in the re-read list, fetch the full content — description, review comments, and diff — applying the same limits as Step 1 (max 20 files per PR, skip files over 500 lines, skip generated/binary/translation files). Update the test coverage catalog and the **PR artifacts inventory** as described in Step 1 of SKILL.md. If a re-read PR has no test files, apply the same filesystem search from Step 1's pull requests section using [`references/security-test-directories.md`](references/security-test-directories.md).

5. Compare all sources against the published comment and identify:
   - New acceptance criteria not covered by any existing scenario
   - Existing scenarios now incorrect due to changes in the issue or PRs
   - Sections referencing outdated information (wrong URLs, feature flag names, milestones)
   - Known Limitations that have been resolved or new ones that have emerged
   - New test files that should be reflected in automation coverage lines

6. Apply only the identified changes. Do not rewrite accurate sections. If new scenarios must be written, follow the [Writing scenarios](../SKILL.md#writing-scenarios) and [Saving the draft](../SKILL.md#saving-the-draft) procedures from Step 3 of SKILL.md — skip the Sources Summary sub-step there (the update-mode version with PR re-read info is emitted in step 8 below).

7. Replace Step 3's generic "Draft saved…" message: tell the user exactly what changed and what was left unchanged.

8. Output the Sources Summary as defined in `references/output-formats.md`. Include one row per linked PR showing whether it was re-read or skipped.
