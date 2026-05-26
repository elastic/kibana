# Generate Mode — Existing Plan Found

This file is read when the user says `generate / create / write` and an existing published test plan is found for the issue.

---

Stop and tell the user:

> "A test plan already exists for issue #<number>. Would you like me to check if it is still up to date?
>
> **A) Check and update if needed** — I will re-read the issue, sub-issues, and any new PRs, compare them against the published plan, and add only what is missing or outdated. I will not rewrite what is still accurate.
>
> **B) Generate from scratch** — I will ignore the existing plan and generate a new one. The existing comment will be overwritten when you publish.
>
> **C) Cancel** — do nothing."

**If the user selects A:** Run the full update flow — read [`mode-update.md`](mode-update.md) and follow every step in that file. The published comment serves as the baseline; the PR-activity optimisation, URL re-categorization, special handling for implemented Pending sub-issues, full-document self-review rules, and the Issue Clarity Assessment re-evaluation defined there all apply.

After step 7 of `mode-update.md`, if **no gaps were found** (i.e. step 5 produced an empty change list), do not save a draft — instead tell the user *"The existing test plan appears to be up to date. No changes are needed."*

**If the user selects B:** proceed normally through Steps 1, 1.5, 2, 3, and 3.5 of [`../SKILL.md`](../SKILL.md). The Issue Clarity Assessment (Step 1.5 stop-and-ask gate + Step 3.5 Coverage Ratio assembly) is part of the standard flow and is **not** skipped just because a previous plan existed.
