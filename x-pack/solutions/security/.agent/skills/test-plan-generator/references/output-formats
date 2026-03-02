# Output Formats

This file defines the format of summaries and structured outputs that the agent produces in the chat after completing key operations. Read this file whenever the skill instructs you to output a Sources Summary.

---

## Sources Summary

Output this table in the chat immediately after saving a draft — whether generating from scratch, checking and updating an existing plan, or running an incremental update.

The goal is to give the user full traceability of what the agent read, what it used, and what it could not access.

### Format
```markdown
### 📋 Sources used to generate this test plan

| Source | Status |
|---|---|
| Issue #<number> — <title> | ✅ Read |
| Parent issue #<number> — <title> | ✅ Read / ⛔ No parent |
| Sub-issue #<number> — <title> | ✅ Read |
| PR #<number> — <title> | ✅ Read / ⚠️ Partially read (N files skipped — too large) / ⛔ Not found |
| Figma — <file or node name> | ✅ Read / ⚠️ Read with errors / ⛔ Inaccessible |
| Image — <url or description> | ✅ Analyzed / ⛔ Could not fetch |
| Google Doc — <title or url> | ✅ Read / ⛔ MCP not available |
| Parent test plan (issue #<number>) | ✅ Found and used as reference / ➖ Not found |
| Sub-issue test plan (issue #<number>) | ✅ Found and used as reference / ➖ Not found |

> ⚠️ Items marked ⛔ were not available and may have affected the completeness of the test plan.
```

### Rules

- Include a row for **every source encountered**, whether successfully read or not. Do not omit sources that failed — they are the most important ones to surface.
- Use exactly one status per row — pick the most accurate one from the options shown.
- If there are multiple sub-issues or PRs, include one row per item.
- If there is no parent issue, include the row anyway with status `⛔ No parent` so the user can see it was checked.
- If a source was partially read (e.g. a PR with skipped files), use `⚠️` and describe what was skipped in parentheses.