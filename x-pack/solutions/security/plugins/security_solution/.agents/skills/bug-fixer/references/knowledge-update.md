# Knowledge Update Protocol

After every session (success or failure), review what you learned and update `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/KNOWLEDGE.md`.

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

Append entries using this structure (matches the existing entries in KNOWLEDGE.md):

```markdown
### <Short title>
- **Date**: <today's date>
- **Incident**: <what happened — what the agent did and what went wrong>
- **Generic rule**: → <where the resulting rule lives, e.g. classification-guide.md Fix Strategies>
```

## Rules

- **Append-only** — never delete existing entries
- **No duplication** — don't repeat what's in Scout best practices skills or the classification guide
- **Non-obvious only** — add an entry only if ALL three conditions are true:
  1. The learning is not already described in `classification-guide.md` or `fix-workflow.md`
  2. The agent made at least one incorrect assumption this learning would have prevented (it took multiple attempts to reach the correct action)
  3. The learning is reproducible — it would apply to a different bug in the same area, not just this specific issue
- **User confirmation required** — ask before writing: _"I learned [X]. Should I add it to the knowledge base?"_
