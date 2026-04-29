---
name: bug-fixer
description: >
  End-to-end Kibana Security Solution bug reproduction, TDD fixing, and verification
  using a browser MCP (Playwright or cursor-ide-browser). Use when user says "reproduce bug #NNN",
  "fix bug #NNN", "analyze bug #NNN", "investigate issue #NNN", or asks to triage, reproduce,
  or fix a Kibana Security Solution GitHub issue.
---

# Bug Fixer

Orchestrate bug reproduction and TDD fixing for Kibana Security Solution issues.

## Prerequisites

- `gh` CLI authenticated (`gh auth status`)
- Local `elastic/kibana` clone with `yarn kbn bootstrap` completed

## Knowledge Base

At session start, read `.agents/skills/bug-fixer/KNOWLEDGE.md` if it exists. Apply relevant learnings. See `references/knowledge-update.md` for the update protocol used at session end.

## Workflow

**STRICT PHASE ORDER: 0 → 1 → 2 → 3 → 4 → 5 → 6. NEVER skip or reorder phases. Do NOT touch any source code until Phase 4.**

### Phase 0: Analyze

Run from the **Kibana repo root** — this is the FIRST thing you do (no running server needed):

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

**Review similar issues and related PRs** — this is mandatory, not optional.

**Run these in parallel** (use parallel tool calls or subagents — these are all independent reads):
- If `similar_issues` is non-empty, read each one (`gh issue view <number> --repo elastic/kibana`) to understand how similar bugs manifested and whether the same root cause applies here.
- If `related_prs` is non-empty, review each PR's diff (`gh pr diff <number> --repo elastic/kibana`) to understand what was changed and why. If a past PR fixed a similar bug, its approach is your strongest signal for how to fix this one.
- Search for closed issues with similar symptoms: `gh search issues "<key symptom>" --repo elastic/kibana --state closed --limit 5`. Prior fixes may reveal patterns, pitfalls, or areas the current fix must also cover.

Merge results before proceeding. Summarize what you learned from prior issues/PRs.

**GATE**: If `possibly_fixed` is `true`, inform the user and only proceed if they confirm.

### Phase 1: Start Services

**YOU must start the server. Do NOT ask the user.** Use `server_args` from `analysis.json`:

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

Array feature flag values MUST use JSON format (`["flag1","flag2"]`), not YAML (`['flag1','flag2']`).

**NEVER edit `kibana.dev.yml`** — pass ALL config via command-line args so nothing persists between sessions.

**While services are starting** (can take 5+ minutes), **run these research tasks in parallel** using subagents or parallel tool calls — they are all independent and the boot time is wasted otherwise:
- Read `affected_paths` from `analysis.json` and study the relevant source code
- Review related PRs: `gh pr diff <NUMBER> --repo elastic/kibana`
- Read `references/classification-guide.md` for fix strategies
- Read `KNOWLEDGE.md` for relevant prior learnings

Merge results when all complete. You should have a solid understanding of the affected code before services finish booting.

Stop services:
```bash
pkill -f 'node.*scripts/kibana' ; pkill -f 'org.elasticsearch'
```

### Phase 2: Prepare — Do It Yourself

**YOU set up the environment. Do NOT ask the user to do things you can do.**

First verify Kibana is ready:
```bash
curl -s -u elastic:changeme http://localhost:5601/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); print(s['status']['overall']['level'])"
```

Read `prerequisites`, `reproduction_steps`, and the original ticket's preconditions. Then **execute**:

1. **Roles/users** — Create via `POST /api/security/role/<name>` and `POST /internal/security/users/<name>` with appropriate privileges.
2. **Data** — Prefer API for all data setup: index documents, create saved objects, detection rules, sample data via curl. Use the browser MCP only for setup steps that have no API equivalent (e.g., walking through a wizard with no API).
3. **Feature state** — Walk through required states using the browser MCP.
4. **License** — Verify trial: `curl -u elastic:changeme http://localhost:5601/api/licensing/info`

**Only ask the user** for: external tooling you lack, large data volumes, or physical access requirements.

**GATE**: Verify all prerequisites pass before proceeding.

### Phase 3: Investigate & Reproduce — MANDATORY

**You MUST complete this phase before writing or changing ANY code. No exceptions.**

Browser reproduction is an investigation step — the diagnostics you collect here are your primary evidence for writing tests and implementing fixes.

#### Reproduction method

**DEFAULT: Always reproduce through the browser.** Use `browser_navigate`, `browser_click`, `browser_fill`, `browser_snapshot`, and `browser_wait_for` to walk through the steps exactly as a user would.

**CRITICAL: Follow the EXACT steps from the issue.** If the ticket says "navigate to page X via menu Y", you must navigate there in the browser — not call the API you think backs that page. Different navigation paths hit different code paths. A shortcut API call may exercise a completely different route and mask the real defect.

**SELF-CHECK #1:** _"Am I about to use curl, fetch, or any API call to reproduce this bug?"_ If yes, **STOP. That is wrong.** API reproduction is ONLY allowed when the ticket explicitly states the bug is API-only and was reproduced via API.

**SELF-CHECK #2:** _"Am I following the exact steps from the issue, or am I taking a shortcut?"_ If you're deviating from the ticket's reproduction steps, **STOP and follow the original steps.** Your shortcut may hit a different code path entirely.

**Basic auth login**: In a local dev server, log in via `http://localhost:5601/login` with `elastic` / `changeme`.

#### Authenticate and reproduce

1. `browser_navigate` → `http://localhost:5601/login`
2. `browser_snapshot` — if you see "Please upgrade your browser", just call `browser_snapshot` again (no wait needed). This is a transient message shown before Kibana's JS bundle loads. Do NOT use `browser_wait_for` here — it can block indefinitely.
3. Log in with `elastic` / `changeme`
4. Follow `reproduction_steps` from `analysis.json`: `browser_navigate` → `browser_snapshot` → `browser_click`/`browser_fill` → `browser_wait_for` → assert

#### Collect diagnostics

After the bug manifests:
- `browser_console_messages` — JS exceptions, React errors, failed assertions
- `browser_network_requests` — 4xx/5xx responses, failed requests, stale payloads
- For perf issues: `browser_profile_start` before, `browser_profile_stop` after

#### Trace the data path (mandatory for "X is not visible" bugs)

When the bug is about missing, empty, or stale data in the UI:
1. **Identify the API call** — use `browser_network_requests` to find the exact endpoint the UI component calls to display the data.
2. **Trace what populates that data** — read the route handler and follow the data source: is it a database query? An ES index? A saved object? A cached value from startup?
3. **Find the lifecycle gap** — ask: _"Is there any scenario where this data would NOT be populated when the API is called?"_ Common gaps: data only seeded at boot, data only created by a different user action, data not initialized for new tenants/spaces.

This trace is your primary evidence for choosing what to fix. Without it, you risk fixing a symptom (e.g., an error on a different API) while the real data path remains broken.

Summarize: failing endpoints, console errors, component names, request/response data, **and the data path trace**. **Present findings to the user** before proceeding.

**GATE**: Bug reproduced with diagnostics → Phase 4. Could not reproduce → inform user, ask how to proceed.

### Phase 4: Fix (Strict TDD)

**GATE CHECK**: You MUST have completed Phase 3 (browser reproduction + diagnostics) before reaching this phase. If you have not reproduced the bug in the browser yet, go back to Phase 3 NOW.

**Do NOT write any code — not a single test, not a single file edit, not a single line — until the user has explicitly approved the plan in Step 1. This is a hard gate, not a suggestion.**

#### Step 1: Root cause analysis and fix plan

Combine your Phase 1 code reading with Phase 3 diagnostics to pinpoint the defect.

**First**, cross-reference `affected_paths` with network failures (→ route handler), console errors (→ component), stale data (→ mutation hook), missing API calls (→ UI code path). Trace the code path from the UI action to the underlying data source. This gives you an initial hypothesis.

**Then, run these research tasks in parallel** (use subagents or parallel tool calls — they are all independent):
1. **Review prior fixes** — revisit `similar_issues` and `related_prs` from Phase 0. If a past PR fixed a related bug, read its diff carefully: what pattern did it follow? What files did it touch? Did it miss anything that later required a follow-up?
2. **Map the full impact scope** — identify every area affected by the root cause, not just the one the ticket describes. Ask: _"If this code path is broken here, where else is it used?"_ Check: sibling UI components that share the same hook/utility, other API routes that call the same service method, other spaces/tenants/roles that exercise the same logic.
3. **Search for codebase conventions** — run SELF-CHECK #3 questions 1–4 (below): `rg` for existing patterns, hardcoded namespaces, plugin boundaries, and lifecycle phases.
4. **Find all call sites** — run SELF-CHECK #3 questions 5–6 (below): `rg` for every invocation of the broken hook/utility/action and check if a shared utility owns the logic.
5. **Find existing tests** — look for tests near affected code to copy patterns, and determine the test layer (see `references/classification-guide.md`).

**Merge all results**, then read `references/fix-workflow.md` and answer all six SELF-CHECK #3 questions using the gathered evidence.

**Present your Root Cause Analysis and Fix Plan** to the user using the template in `references/fix-workflow.md`.

**Your message presenting the plan MUST end with exactly:**

> _"I am waiting for your approval before writing any code or tests. Do you approve this plan as written?"_

Do NOT write any code, modify any file, or call any tool after that line. Your turn ends here. If the user identifies a misdiagnosis or a better approach, revise the plan and ask for approval again.

#### Step 2: Red — write failing test

**GATE RE-CHECK**: Re-read the last user message. Did the user explicitly approve the plan (e.g., "yes", "proceed", "approved", "looks good")? If not — even if you believe the plan is obviously correct — go back to Step 1 and present the plan again. Do NOT begin Step 2 without explicit approval.

Write a test asserting correct behavior. Use diagnostic evidence to target precisely.

For Scout tests, read these skills BEFORE writing:
1. `.agents/skills/scout-create-scaffold/SKILL.md`
2. `.agents/skills/scout-best-practices-reviewer/SKILL.md`
3. `x-pack/solutions/security/plugins/security_solution/.agents/skills/scout-best-practices-reviewer/SKILL.md`

**Run the test NOW — expect it to fail:**

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

**GATE**: `red_confirmed` (non-zero exit) → proceed. `red_rejected` (zero exit) → rewrite the test.

#### Step 3: Green — implement fix

**Keep fixes simple.** Prefer the smallest, most targeted change that resolves the bug. If a fix starts touching more than 2–3 files or requires architectural changes, **stop and ask the user** how they want to proceed before continuing.

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

**Clean environment verification** — restart services to ensure no stale data from Phase 3 reproduction influences the result:

1. Stop and restart services (same commands as Phase 1, with same `server_args`)
2. Re-create test data from scratch (same steps as Phase 2)
3. Browser reproduction — bug should NOT reproduce
4. `browser_console_messages` + `browser_network_requests` — verify that errors captured during Phase 3 reproduction are gone AND no new errors appeared
5. **Lifecycle edge case check** — if the fix involves a startup migration, initialization routine, or boot-time seeding, explicitly test post-boot creation: create a new space/resource AFTER services are running and verify the fix still works. This catches the common "works at boot but not for resources created later" gap.
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

**GATE**: Only enter this phase if Phase 5 verdict is **Fix verified**.

**Your message MUST end with exactly:**

> _"Fix verified. Would you like me to open a draft PR?"_

Do NOT create a branch, commit, push, or call any tool after that line. Your turn ends here.

**GATE RE-CHECK** (next turn): Re-read the last user message. Did the user explicitly say yes? If not, skip this phase and proceed to Output.

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

## Knowledge Update — MANDATORY after every session

**You MUST complete this section after Phase 5 (or Phase 6), regardless of outcome.**

Read `references/fix-workflow.md` (Session Learnings Template) and present the structured learning summary to the user. Cover: surprises/mistakes, proposed generic rules for SKILL.md or classification-guide.md, and incident-specific context for KNOWLEDGE.md.

**STOP. Wait for the user to confirm** which entries to add before writing to any file. See `references/knowledge-update.md` for the entry format.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ES fails to start | Check `node scripts/es snapshot` output; ensure no other ES instance is running on port 9200 |
| Kibana fails to start | Check console output; ensure `yarn kbn bootstrap` completed and port 5601 is free |
| Kibana slow to start | Can take 5+ min on first run; poll `/api/status` rather than assuming a fixed wait time |
| ES returns 401 | Default credentials are `elastic` / `changeme` |
| Config not taking effect | **NEVER edit `kibana.dev.yml`**. Pass ALL config via `--xpack.*` CLI args |
| `red_rejected` — test passes | Test must assert **correct** behavior that is currently broken |
| Jest test not found | Verify path is correct and relative to repo root |
| `gh api` errors | `gh auth status` and `gh auth refresh` |
| "Please upgrade your browser" on login | Transient — just call `browser_snapshot` again. Do NOT use `browser_wait_for` |
| Browser can't find element | Take fresh `browser_snapshot` after navigation/waits |
