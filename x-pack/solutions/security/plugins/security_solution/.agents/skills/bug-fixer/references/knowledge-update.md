# Knowledge Update Protocol

After every session (success or failure), review what you learned and update `.agents/skills/bug-fixer/KNOWLEDGE.md`.

## What to Capture

Only add entries that would help future sessions:

| Category | Example |
|----------|---------|
| **New bug pattern** | "Discovered `race_condition_on_concurrent_saves` — concurrent API calls cause data corruption due to missing optimistic locking." |
| **Fix strategy** | "For `stale_data_after_mutation`, invalidate all related query keys together, not just the primary one." |
| **Component gotcha** | "`SecuritySolutionPageWrapper` swallows child errors. Check toast notifications for error states." |
| **Test approach** | "Testing permission-gated features requires a custom role — the default test user may have full privileges." |
| **Environment gotcha** | "Scout takes ~4 min to fully start some features even after Kibana reports healthy." |
| **Dead end** | "Invalidating the primary query cache didn't fix the stale UI — root cause was a missing WebSocket subscription." |

## Format

Append entries using this structure:

```markdown
### <Category>: <Short title>
- **Issue**: #<number> (or "general")
- **Date**: <today's date>
- **Learning**: <what you learned>
- **Context**: <why this matters for future sessions>
```

## Rules

- **Append-only** — never delete existing entries
- **No duplication** — don't repeat what's in Scout best practices skills or the classification guide
- **Non-obvious only** — capture things that were surprising or took multiple attempts
- **User confirmation required** — ask before writing: _"I learned [X]. Should I add it to the knowledge base?"_
