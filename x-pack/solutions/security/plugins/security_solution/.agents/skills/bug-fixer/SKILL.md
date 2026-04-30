---
name: bug-fixer
description: >
  End-to-end Kibana Security Solution bug reproduction, TDD fixing, and verification
  using a browser MCP (Playwright or cursor-ide-browser). Trigger this skill whenever
  the user mentions a bug number, issue number, or asks to fix, reproduce, investigate,
  triage, or debug anything in Kibana Security Solution — even if they just say
  "look into #NNN", "something's broken with X", or "can you fix this issue".
  Don't wait for the magic words "fix bug" — if there's a GitHub issue number and a
  Security Solution context, this skill applies.
---

# Bug Fixer

Orchestrate bug reproduction and TDD fixing for Kibana Security Solution issues.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Local `elastic/kibana` clone with `yarn kbn bootstrap` completed
- Browser MCP for reproduction:
  - **Cursor** — `cursor-ide-browser` is built in, no setup needed
  - **Claude Code** — add to `~/.claude/mcp.json` and restart:
    ```json
    { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
    ```

## Knowledge Base

At session start, read `.agents/skills/bug-fixer/KNOWLEDGE.md` if it exists. Apply relevant learnings.

## Workflow

The phases run in order: 0 → 1 → 2 → 3 → 4 → 5 → 6. Each phase produces evidence the next phase depends on — skipping Phase 3 (browser reproduction) means writing a fix without diagnostic data, which is the single biggest source of misdiagnosis and rejected PRs. Hold the order.

### Phase 0: Analyze

Run from the **Kibana repo root** — this is the first thing you do (no running server needed).

The default repo is `elastic/kibana`. If the user provides only a number (e.g. "fix bug #12345"), fetch from there. If the ticket lives in a different repo, the user must say so explicitly (e.g. "fix bug #12345 in elastic/security-team") — don't guess or search across repos.

```bash
gh issue view <NUMBER> --repo elastic/kibana \
  --json number,title,body,labels,comments,createdAt,state
```

Parse the issue body and extract into an `analysis.json` file at the Kibana repo root. Key fields to populate:

- `classification` — bug pattern (see `references/classification-guide.md`)
- `confidence` — high / medium / low
- `prerequisites` — roles, permissions, prior state required
- `reproduction_steps` — exact steps from the issue
- `affected_paths` — source paths identified from the issue
- `similar_issues` — numbers of related issues found
- `related_prs` — numbers of related PRs found
- `possibly_fixed` — true if evidence suggests already fixed
- `server_args` — feature flags or config overrides mentioned in the issue
- `screenshots` — image URLs from the issue body
- `video_urls` — video URLs from the issue body

If `screenshots` or `video_urls` are present, review them — use the Read tool for images and `browser_navigate` for videos. The video often shows steps not captured in text.

Reviewing similar issues and related PRs is worth the time — prior fixes are your strongest signal for how to approach this one.

Dispatch these as subagents — each reads potentially large PR diffs and issue threads, and keeping that work out of the main conversation saves significant context:
- If `similar_issues` is non-empty, read each one (`gh issue view <number> --repo elastic/kibana`) to understand how similar bugs manifested and whether the same root cause applies here.
- If `related_prs` is non-empty, review each PR's diff (`gh pr diff <number> --repo elastic/kibana`) to understand what was changed and why. If a past PR fixed a similar bug, its approach is your strongest signal for how to fix this one.
- Search for closed issues with similar symptoms: `gh search issues "<key symptom>" --repo elastic/kibana --state closed --limit 5`. Prior fixes may reveal patterns, pitfalls, or areas the current fix must also cover.

Merge results before proceeding. Summarize what you learned from prior issues/PRs.

**Validate the ticket before proceeding.** Check that the issue contains:
- Steps to reproduce (specific navigation path and user actions)
- Current behavior (error message, empty state, wrong value)
- Expected behavior
- Feature flags — if the classification or issue body hints at experimental features but no flags are listed, flag this to the user: the skill cannot start services with the right config without them, and the reproduction will fail silently

If any of these are missing, tell the user what's missing and ask them to update the ticket before continuing. A poorly specified ticket leads to misdiagnosis — it's faster to fix the ticket now than to debug a wrong fix later.

If `possibly_fixed` is `true`, let the user know and get their confirmation before starting the environment.

### Phase 1: Start Services

Start the server yourself — asking the user to do it breaks the flow and costs time. Use `server_args` from `analysis.json`:

```bash
# Start Elasticsearch
node scripts/es snapshot &

# Start Kibana — no feature flags
node scripts/kibana --dev --no-base-path &

# Start Kibana — with feature flags (from analysis.json server_args)
node scripts/kibana --dev --no-base-path \
  --xpack.securitySolution.enableExperimental='["someFeatureFlag"]' \
  --feature_flags.overrides.aiAssistant.aiAgents.enabled=true \
  &

# Wait for Kibana to be ready (poll every 10s)
until curl -s -u elastic:changeme http://localhost:5601/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)" 2>/dev/null; do
  echo "Waiting for Kibana..."; sleep 10
done
echo "Kibana is ready"
```

Array feature flag values use JSON format (`["flag1","flag2"]`), not YAML (`['flag1','flag2']`).

Pass all config via command-line args rather than `kibana.dev.yml` — CLI args are session-scoped and won't silently affect other developers or future sessions.

While services are starting (can take 5+ minutes), run these research tasks in parallel — the boot time is otherwise wasted:
- Read `affected_paths` from `analysis.json` and study the relevant source code
- Review related PRs: `gh pr diff <NUMBER> --repo elastic/kibana`
- Read `references/classification-guide.md` for fix strategies
- Read `KNOWLEDGE.md` for relevant prior learnings

Merge results when all complete. You should have a solid understanding of the affected code before services finish booting.

Stop services:
```bash
pkill -f 'node.*scripts/kibana' ; pkill -f 'org.elasticsearch'
```

### Phase 2: Prepare

Set up the environment yourself — don't ask the user for things you can do via API.

First verify Kibana is ready:
```bash
curl -s -u elastic:changeme http://localhost:5601/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); print(s['status']['overall']['level'])"
```

Read `prerequisites`, `reproduction_steps`, and the original ticket's preconditions. Then execute:

1. **Roles/users** — Create via `POST /api/security/role/<name>` and `POST /internal/security/users/<name>` with appropriate privileges.
2. **Data** — Prefer API for all data setup: index documents, create saved objects, detection rules, sample data via curl. Use the browser MCP only for setup steps that have no API equivalent (e.g., walking through a wizard with no API).
3. **Feature state** — Walk through required states using the browser MCP.
4. **License** — Verify trial: `curl -u elastic:changeme http://localhost:5601/api/licensing/info`

Ask the user only for: external tooling you lack, large data volumes, or physical access requirements.

Verify all prerequisites pass before moving to reproduction.

### Phase 3: Investigate & Reproduce

Complete this phase before touching any source code. The browser diagnostics you collect here — console logs, network traces, component state — are your primary evidence for writing a precise test and targeting the right fix. Without them, you're guessing.

#### Reproduction method

Reproduce through the browser. Use `browser_navigate`, `browser_click`, `browser_fill`, `browser_snapshot`, and `browser_wait_for` to walk through the steps exactly as a user would.

Follow the exact steps from the issue. If the ticket says "navigate to page X via menu Y", navigate there in the browser — not via an API call. The UI and API often hit different code paths; a shortcut API call can exercise a completely different route and mask the real defect.

Ask yourself: _"Am I about to use curl or an API call to reproduce this bug?"_ If yes, pause — API reproduction is only appropriate when the ticket explicitly states the bug is API-only. The UI path is almost always the right one.

Also ask: _"Am I following the exact steps from the issue, or taking a shortcut?"_ Shortcuts often hit different code paths entirely.

**Basic auth login**: Log in via `http://localhost:5601/login` with `elastic` / `changeme`.

#### Authenticate and reproduce

1. `browser_navigate` → `http://localhost:5601/login`
2. `browser_snapshot` — if you see "Please upgrade your browser", call `browser_snapshot` again. This is a transient message shown before Kibana's JS bundle loads; using `browser_wait_for` here can block indefinitely.
3. Log in with `elastic` / `changeme`
4. Follow `reproduction_steps` from `analysis.json`: `browser_navigate` → `browser_snapshot` → `browser_click`/`browser_fill` → `browser_wait_for` → assert

#### Collect diagnostics

After the bug manifests:
- `browser_console_messages` — JS exceptions, React errors, failed assertions
- `browser_network_requests` — 4xx/5xx responses, failed requests, stale payloads
- For perf issues: `browser_profile_start` before, `browser_profile_stop` after

#### Trace the data path (for "X is not visible" bugs)

When the bug is about missing, empty, or stale data in the UI:
1. **Identify the API call** — use `browser_network_requests` to find the exact endpoint the UI component calls to display the data.
2. **Trace what populates that data** — read the route handler and follow the data source: is it a database query? An ES index? A saved object? A cached value from startup?
3. **Find the lifecycle gap** — ask: _"Is there any scenario where this data would NOT be populated when the API is called?"_ Common gaps: data only seeded at boot, data only created by a different user action, data not initialized for new tenants/spaces.

This trace is your primary evidence for choosing what to fix. Without it, you risk fixing a symptom while the real data path remains broken.

Summarize: failing endpoints, console errors, component names, request/response data, and the data path trace. Present findings to the user and wait for their response before doing anything else. This is a hard stop — the user must see what the browser showed before investigation turns into implementation.

- Bug reproduced → wait for user acknowledgement, then move to Phase 4
- Could not reproduce → tell the user what you tried and what you observed, ask how to proceed. Do not enter Phase 4.

### Phase 4: Fix (TDD)

Before entering this phase, verify two things:
1. Phase 3 is complete — you have browser diagnostics (console logs, network traces) from a confirmed reproduction. If you don't, return to Phase 3. A fix without reproduction data is a guess.
2. The user has seen and acknowledged your Phase 3 findings. If they haven't responded yet, wait.

Once both are true, proceed — but don't write any code until the user has explicitly approved the fix plan in Step 1. Presenting the plan first is what allows engineers to catch misdiagnoses before implementation, not during code review.

#### Step 1: Root cause analysis and fix plan

Combine your Phase 1 code reading with Phase 3 diagnostics to pinpoint the defect.

Cross-reference `affected_paths` with network failures (→ route handler), console errors (→ component), stale data (→ mutation hook), missing API calls (→ UI code path). Trace the code path from the UI action to the underlying data source. This gives you an initial hypothesis.

Then dispatch these as subagents — PR diffs and source files are large, and running them as subagents keeps that bulk out of the main conversation context:
1. **Review prior fixes** — revisit `similar_issues` and `related_prs` from Phase 0. If a past PR fixed a related bug, read its diff carefully: what pattern did it follow? What files did it touch? Did it miss anything that later required a follow-up?
2. **Map the full impact scope** — identify every area affected by the root cause, not just the one the ticket describes. Ask: _"If this code path is broken here, where else is it used?"_ Check: sibling UI components that share the same hook/utility, other API routes that call the same service method, other spaces/tenants/roles that exercise the same logic.
3. **Search for codebase conventions** — run SELF-CHECK #3 questions 1–4 (below): `rg` for existing patterns, hardcoded namespaces, plugin boundaries, and lifecycle phases.
4. **Find all call sites** — run SELF-CHECK #3 questions 5–6 (below): `rg` for every invocation of the broken hook/utility/action and check if a shared utility owns the logic.
5. **Find existing tests** — look for tests near affected code to copy patterns, and determine the test layer (see `references/classification-guide.md`).

Merge all results, then read `references/fix-workflow.md` and answer all six SELF-CHECK #3 questions using the gathered evidence.

Present your Root Cause Analysis and Fix Plan to the user using the template in `references/fix-workflow.md`. End your message with exactly:

> _"I am waiting for your approval before writing any code or tests. Do you approve this plan as written?"_

Stop there and wait. Do not write code, open files for editing, or call any tool. Your turn ends at that question. If the user identifies a misdiagnosis or a better approach, revise the plan and ask for approval again.

#### Step 2: Red — write failing test

Re-read the user's last message before doing anything. Did they explicitly approve — "yes", "proceed", "approved", "looks good", or similar? If the response is ambiguous or missing, present the plan again and wait. Don't interpret silence or a question as approval. This sign-off is the only thing that separates a validated fix from an hour of work in the wrong direction.

Write a test asserting correct behavior. Use diagnostic evidence to target precisely.

For Scout tests, read these skills before writing:
1. `.agents/skills/scout-create-scaffold/SKILL.md`
2. `.agents/skills/scout-best-practices-reviewer/SKILL.md`
3. `x-pack/solutions/security/plugins/security_solution/.agents/skills/scout-best-practices-reviewer/SKILL.md`

Run the test and expect it to fail:

```bash
node scripts/jest <path/to/test.ts> --no-coverage 2>&1
echo "Exit code: $?"
# Non-zero exit = red confirmed (test fails as expected) ✓
# Zero exit = test already passes — the test does not capture the bug, rewrite it
```

For Scout API/UI tests:
```bash
node scripts/scout run-tests --config <config-path>
```

A passing test at this stage means the test isn't capturing the bug — rewrite it before moving on.

#### Step 3: Green — implement fix

Keep fixes simple. Prefer the smallest, most targeted change that resolves the bug. If a fix starts touching more than 2–3 files or requires architectural changes, stop and ask the user how they want to proceed — scope creep is easier to catch before implementation than in review.

1. Consult prior fixes or `references/classification-guide.md` for strategy.
2. Read surrounding source to match codebase patterns.
3. Verify the fix:
   ```bash
   # Run the target test
   node scripts/jest <path/to/test.ts> --no-coverage

   # Run related tests in the same area to catch regressions
   node scripts/jest --testPathPattern='<area-pattern>' --no-coverage
   ```
4. Iterate until `fix_verified`.

### Phase 5: Verify

Restart services for a clean environment — stale state from Phase 3 reproduction can produce false positives:

1. Stop and restart services (same commands as Phase 1, with same `server_args`)
2. Re-create test data from scratch (same steps as Phase 2)
3. Browser reproduction — the bug should not reproduce
4. `browser_console_messages` + `browser_network_requests` — verify that errors captured during Phase 3 are gone and no new errors appeared
5. **Lifecycle edge case** — if the fix involves a startup migration or boot-time seeding, create a new space/resource *after* services are running and verify it works. This catches the "works at boot but not for resources created later" failure mode.
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

### Phase 6: Open PR

Only proceed here if Phase 5 verdict is **Fix verified**.

End your message with exactly:

> _"Fix verified. Would you like me to open a draft PR?"_

Stop there. Re-read the user's next message before doing anything — if they didn't explicitly say yes, skip to Output.

If the user confirms:

1. Create a branch from the current state:
   ```bash
   git checkout -b fix/<issue-number>
   ```
2. Stage and commit all changes with a message referencing the issue:
   ```bash
   git add -A
   git commit -m "Fix #<number> — <short description>"
   ```
3. Push the branch:
   ```bash
   git push -u origin HEAD
   ```
4. Open a draft PR using the Bug Fix Summary as the body:
   ```bash
   gh pr create --draft --title "Fix #<number> — <short description>" --body "<Bug Fix Summary>"
   ```
5. Present the PR URL to the user.

## Output

```
## Bug Fix Summary
- **Issue**: #<number> — <title>
- **Classification**: <pattern> (confidence: <level>)
- **Reproduction**: <reproduced / not reproduced>
- **Test file**: <path to new test>
- **Fix applied**: <brief description>
- **Verification**: <fix_verified / fix_failed>
- **PR**: <url> (draft) or "not requested"
```

## Knowledge Update

After Phase 5 (or Phase 6), read `references/fix-workflow.md` (Session Learnings Template) and present a structured learning summary to the user. Also read `references/knowledge-update.md` for the entry format. Wait for the user to confirm which entries to add before writing to any file.

## Troubleshooting

If something goes wrong, read `references/troubleshooting.md` for common problems and solutions.
