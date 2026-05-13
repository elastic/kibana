---
name: bug-fix
description: >
  Use after /bug-reproduce has confirmed reproduction and the user has reviewed the
  report. Requires analysis.json and reproduction-report.md at the Kibana repo root.
---

# Bug Fix

Implements a verified fix for a reproduced Security Solution bug.

## Starting context

Read these files before doing anything else:
- `analysis.json` — classification, affected paths, server args, similar issues, related PRs
- `reproduction-report.md` — browser diagnostics, data path trace, root cause hypothesis

If either file is missing, or if `reproduction-report.md` has `status: not_reproduced`
or `user_acknowledged: pending`, stop immediately and tell the user:
_"Run `/bug-reproduce #NUMBER` first. This skill requires a confirmed browser
reproduction before fix work can begin."_

## Phase 4: Fix (TDD)

**Before doing anything in this phase**, verify:

1. `reproduction-report.md` exists at the Kibana repo root
2. Its `status` field is `reproduced`
3. Its `user_acknowledged` field is `yes`

If any of these are false, stop. Do not read any source file for fixing purposes. Return
to Phase 3 and complete the browser reproduction first.

The clearer the bug seems from code analysis, the more important this check is.
Certainty before reproduction is a red flag, not a green light — a bug that looks
obvious in isolation is still frequently misdiagnosed (wrong code path, wrong root
cause, wrong fix strategy). The browser reproduction and plan approval steps exist
precisely to catch that.

Don't write any code until the user has explicitly approved the fix plan. Presenting the
plan first is what allows engineers to catch misdiagnoses before implementation rather
than during code review.

### Step 1: Root cause analysis and fix plan

Cross-reference `affected_paths` with diagnostics from `reproduction-report.md`:
- Network failures → route handler
- Console errors → component
- Stale data → mutation hook
- Missing API calls → UI code path

Dispatch these as subagents — PR diffs and source files are large:
1. **Review prior fixes** — re-read `similar_issues` and `related_prs` from `analysis.json`.
   What pattern did each fix follow? What did it miss?
2. **Map full impact scope** — where else is this broken path used? Sibling components,
   other routes, other spaces/roles?
3. **Search codebase conventions** — `rg` for existing patterns, hardcoded namespaces,
   plugin boundaries, lifecycle phases (SELF-CHECK #3 questions 1–4)
4. **Find all call sites** — every invocation of the broken hook/utility/action
   (SELF-CHECK #3 questions 5–6)
5. **Find existing tests** — copy patterns, determine test layer

Read `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/fix-workflow.md` and answer all six
SELF-CHECK #3 questions using the gathered evidence.

Present the Root Cause Analysis and Fix Plan using the template in `fix-workflow.md`.
End with exactly:

> _"I am waiting for your approval before writing any code or tests. Do you approve this plan as written?"_

The exact phrase _"Do you approve this plan as written?"_ must be your final sentence.
Any tool call before the user replies with explicit approval (yes / proceed / approved /
looks good) is a protocol violation — revert it and re-present the plan. Do not write
code, open files for editing, or call any tool until that approval arrives.
If the user identifies a misdiagnosis, revise the plan and ask for approval again.

### Step 2: Red — write failing test

Re-read the user's last message. Did they explicitly approve ("yes", "proceed", "approved",
"looks good")? Ambiguous or missing responses are not approval — present the plan again
and wait. Don't interpret silence or a question as approval.

If you are about to create or edit a test file and cannot point to an explicit approval
message in the conversation, stop. Revert any edits made since presenting the plan and
re-present it. No exceptions for bugs that seem obvious.

For Scout tests, use these skills before writing (REQUIRED):
1. scout-create-scaffold
2. scout-best-practices-reviewer
3. Also read `x-pack/solutions/security/plugins/security_solution/.agents/skills/scout-best-practices-reviewer/SKILL.md` — Security Solution-specific Scout practices

Run the test and expect it to fail:
```bash
node scripts/jest <path/to/test.ts> --no-coverage 2>&1
echo "Exit code: $?"
# Non-zero = red confirmed ✓  |  Zero = test already passes — rewrite it
```

For Scout API/UI tests: `node scripts/scout run-tests --config <config-path>`

### Step 3: Green — implement fix

Keep fixes simple — prefer the smallest change that resolves the bug. More than 2–3 files
or architectural changes means stop and ask the user before continuing.

1. Consult prior fixes or `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/classification-guide.md`
2. Match surrounding codebase patterns
3. Verify:
   ```bash
   node scripts/jest <path/to/test.ts> --no-coverage
   node scripts/jest --testPathPattern='<area-pattern>' --no-coverage
   ```
4. Iterate until `fix_verified`

## Phase 5: Verify

Restart services for a clean environment — stale reproduction state produces false positives:

1. Stop and restart the Scout server (same commands as Phase 1, same `server_args` and `config_sets/bug_fixer/kibana.yml`)
2. Re-create test data from scratch (same steps as Phase 2)
3. Browser reproduction — bug should not reproduce
4. `browser_console_messages` + `browser_network_requests` — Phase 3 errors gone, no new errors
5. **Lifecycle edge case** — if the fix involves startup or boot-time seeding, create a new
   space/resource *after* services are running and verify it works
6. Run tests:
   ```bash
   node scripts/jest <path/to/test.ts> --no-coverage
   node scripts/jest --testPathPattern='<area-pattern>' --no-coverage
   ```

| Condition | Verdict |
|-----------|---------|
| All pass + no browser repro | **Fix verified** |
| Tests pass + browser still repros | **Fix incomplete** |
| Tests fail | **Fix broke something** |
| Related tests fail | **Regression** |

## Phase 6: Open PR

Only proceed if Phase 5 verdict is **Fix verified**.

End your message with exactly:

> _"Fix verified. Would you like me to open a draft PR?"_

Stop there. Re-read the user's next message — if they didn't explicitly say yes, skip to Output.

If confirmed:
```bash
git checkout -b fix/<issue-number>
git add -- <files listed in the Fix Plan>
git commit -m "Fix #<number> — <short description>"
git push -u origin HEAD
gh pr create --draft --title "Fix #<number> — <short description>" --body "<Bug Fix Summary>"
```

Present the PR URL to the user.

## Output

```
## Bug Fix Summary
- **Issue**: #<number> — <title>
- **Classification**: <pattern> (confidence: <level>)
- **Reproduction**: reproduced
- **Test file**: <path>
- **Fix applied**: <description>
- **Verification**: fix_verified
- **PR**: <url> (draft) or "not requested"
```

## Knowledge Update

After Phase 5 (or Phase 6), read `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/fix-workflow.md`
(Session Learnings Template) and present a structured summary to the user. Also read
`x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/knowledge-update.md` for the entry format.
Wait for user confirmation before writing to any file.

If something goes wrong, read `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/troubleshooting.md`.
