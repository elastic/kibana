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

**If the user selects A:**

1. Read the published test plan in full — this is the baseline.
2. Run Steps 1 and 2 normally to gather and analyze all current context.
3. Compare the gathered context against the baseline. Identify acceptance criteria, scenarios, or sections that are missing or outdated.
4. If gaps are found: add only the missing scenarios and update only the outdated sections. Do not rewrite accurate sections. If new scenarios must be written, follow the [Writing scenarios](../SKILL.md#writing-scenarios) and [Saving the draft](../SKILL.md#saving-the-draft) procedures from Step 3 — Sources Summary is included there. After saving, replace Step 3's generic "Draft saved…" message: tell the user exactly what was added or changed.
5. If no gaps are found: tell the user "The existing test plan appears to be up to date. No changes are needed." Do not save a draft.

**If the user selects B:** proceed normally through Steps 1, 2, and 3.
