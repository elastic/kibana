# Fix Workflow Reference

Detailed checklists and templates for Phase 4 (Fix) and the Knowledge Update. Read this file when entering Phase 4 Step 1.

## SELF-CHECK #3 — Seven questions before designing any fix

Answer all seven using evidence gathered from your parallel research tasks:

1–4. Complete the **Pre-Fix Checklist** in `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/classification-guide.md` — answer all four checks (existing patterns, hardcoded namespaces, plugin boundaries, feature lifecycle) using the gathered evidence.

5. _"Have I found ALL call sites of the broken action?"_ — `rg` across the codebase for every place the broken hook/utility/action is invoked. UI bugs that appear in one component (e.g., a flyout footer) almost always have sibling entry points (table inline action, context menu, preview panel) that share the exact same broken code path. All of them must be fixed in the same PR.

6. _"Am I threading data around the problem, or fixing the layer that owns it?"_ — When the root cause is a data model change (e.g., which fields an entity exposes), fix the layer that constructs queries/filters from that data, not the component tree above it. Passing a "correct" value down via props is a band-aid; the right fix lives in the shared utility that builds the query from the data record. Before writing a fix, check if such a utility already exists.

7. _"Does the mutation return the updated object?"_ — If yes, call `setState(result)` in `onSuccess` directly — no extra network call needed. If no, check whether the API can be made to return it (often a one-line change). Only fall back to `queryClient.invalidateQueries` if the mutation truly cannot return the updated state. **Never** call initialization or setup functions in `onSuccess` — read every function's implementation before using it there.

## Root Cause Analysis Template

Present your analysis and plan to the user in the following format:

```
## Root Cause Analysis

**What is broken**: <the specific function, route, hook, or component that is wrong>
**Why it is broken**: <the underlying cause — e.g., missing cache invalidation, hardcoded namespace, no lazy init>
**Code path**: <trace from the user action → UI component → API call → data source, with file paths>
**All affected call sites**: <list every place this broken code is invoked>
**Full impact scope**: <all areas affected by this root cause beyond the reported symptom — sibling components, other routes, other spaces/roles>
**Similar issues / prior fixes reviewed**: <list PRs and issues reviewed, what was learned from each, and how it informs this fix — or "none found">

## Fix Plan

**Fix strategy**: <what the fix will do, referencing codebase conventions and prior fix patterns>
**Files to change**: <list of files and what changes in each>
**Test layer**: <unit / API / Scout UI — with justification>
**Test approach**: <what the test will assert>
**Risk areas**: <anything that could go wrong, regressions to watch for>
```

## Session Learnings Template

After Phase 5 (or Phase 6), present learnings to the user:

```
## Session Learnings

### New generic rules (for SKILL.md / classification-guide.md)
- <proposed rule 1 — with exact location>
- <proposed rule 2>
- (or "None — existing rules covered this session")

### Incident-specific context (for KNOWLEDGE.md)
- <proposed entry 1>
- <proposed entry 2>
- (or "None — no new incident-specific learnings")
```

Cover three categories:
1. **What surprised you or took multiple attempts?** — Misdiagnoses, wrong assumptions, unexpected codebase patterns, blind spots in reproduction or fix design.
2. **What new generic rules should be added?** — Reusable principles (e.g., a new self-check question, a new bug pattern, a fix strategy, a pre-fix checklist item). Propose exact text and location.
3. **What incident-specific context should be recorded?** — Concrete details from this session that would help future sessions.
