---
name: bug-reproduce
description: >
  Investigates and reproduces a Kibana Security Solution bug through browser automation.
  Dispatched by the bug-fixer orchestrator — not triggered directly by users.
---

# Bug Reproduce

Investigate and reproduce a Security Solution bug. Produces `analysis.json` and
`reproduction-report.md` at the Kibana repo root.

## Phase 0: Analyze

The default repo is `elastic/kibana`. If the user provides only a number, fetch from there.
A different repo must be stated explicitly — don't search across repos.

```bash
gh issue view <NUMBER> --repo elastic/kibana \
  --json number,title,body,labels,comments,createdAt,state
```

Write `analysis.json` to the Kibana repo root with these fields:
- `classification` — bug pattern (see `.agents/skills/bug-fixer/references/classification-guide.md`)
- `confidence` — high / medium / low
- `prerequisites` — roles, permissions, prior state required
- `reproduction_steps` — exact steps from the issue
- `affected_paths` — source paths identified from the issue
- `similar_issues` — numbers of related issues found
- `related_prs` — numbers of related PRs found
- `possibly_fixed` — true if evidence suggests already fixed
- `server_args` — feature flags or config overrides mentioned in the issue
- `screenshots` / `video_urls` — media URLs from the issue body

If `screenshots` or `video_urls` are present, review them — use the Read tool for images,
`browser_navigate` for videos.

**Validate the ticket before proceeding.** Check that it includes:
- Steps to reproduce (specific navigation path and user actions, not just "go to X")
- Current behavior (error message, empty state, wrong value)
- Expected behavior
- Feature flags — if the classification hints at experimental features but none are listed,
  tell the user: reproduction will fail without them and the ticket needs updating

If anything is missing, tell the user what's needed and wait for an updated ticket.
A poorly specified ticket produces a misdiagnosed fix — it's faster to fix the ticket now.

If `possibly_fixed` is `true`, let the user know and get confirmation before continuing.

Dispatch these as subagents — PR diffs and issue threads are large, and keeping them out
of the main conversation saves significant context:
- Read each `similar_issue` (`gh issue view <number> --repo elastic/kibana`)
- Review each `related_pr` diff (`gh pr diff <number> --repo elastic/kibana`)
- Search closed issues: `gh search issues "<key symptom>" --repo elastic/kibana --state closed --limit 5`

Summarize findings before moving on.

## Phase 1: Start Services

Start the server yourself — don't ask the user. Use `server_args` from `analysis.json`:

```bash
# Start Elasticsearch
node scripts/es snapshot &

# Start Kibana — no feature flags
node scripts/kibana --dev --no-base-path &

# Start Kibana — with feature flags
node scripts/kibana --dev --no-base-path \
  --xpack.securitySolution.enableExperimental='["someFlag"]' &

# Wait for ready (poll every 10s)
until curl -s -u elastic:changeme http://localhost:5601/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)" 2>/dev/null; do
  echo "Waiting for Kibana..."; sleep 10
done
```

Array flag values use JSON format (`["flag1","flag2"]`), not YAML. Pass all config via
CLI args — not `kibana.dev.yml` — so nothing persists between sessions.

While services start, dispatch these as subagents to use the boot time:
- Read `affected_paths` from `analysis.json`
- Review related PR diffs: `gh pr diff <NUMBER> --repo elastic/kibana`
- Read `.agents/skills/bug-fixer/references/classification-guide.md`
- Read `.agents/skills/bug-fixer/KNOWLEDGE.md`

Stop services: `pkill -f 'node.*scripts/kibana' ; pkill -f 'org.elasticsearch'`

## Phase 2: Prepare

Set up the environment yourself — don't ask the user for things you can do via API.

Verify Kibana is ready:
```bash
curl -s -u elastic:changeme http://localhost:5601/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); print(s['status']['overall']['level'])"
```

Execute from `prerequisites` and `reproduction_steps`:
1. **Roles/users** — `POST /api/security/role/<name>` and `POST /internal/security/users/<name>`
2. **Data** — index documents, saved objects, detection rules via API. Browser MCP only
   for wizard steps with no API equivalent.
3. **Feature state** — walk through required states via browser MCP
4. **License** — `curl -u elastic:changeme http://localhost:5601/api/licensing/info`

Ask the user only for: external tooling, large datasets, physical access requirements.
Verify all prerequisites pass before reproducing.

## Phase 3: Reproduce

Complete this phase before any source code is touched. The diagnostics collected here
are the primary evidence for test writing and root cause analysis. Without them, any fix
is a guess.

Reproduce through the browser — not via API calls. The UI and API hit different code paths;
an API shortcut can mask the real defect entirely.

Ask yourself: _"Am I about to use curl or an API call to reproduce this?"_ If yes, stop
and use the browser instead, following the exact steps from the issue.

**Login**: `http://localhost:5601/login` with `elastic` / `changeme`

1. `browser_navigate` → `http://localhost:5601/login`
2. `browser_snapshot` — if you see "Please upgrade your browser", call `browser_snapshot`
   again. This is transient; `browser_wait_for` can block indefinitely here.
3. Log in with `elastic` / `changeme`
4. Follow `reproduction_steps` from `analysis.json`

After the bug manifests, collect:
- `browser_console_messages` — JS exceptions, React errors
- `browser_network_requests` — 4xx/5xx, failed requests, stale payloads
- For perf issues: `browser_profile_start` before, `browser_profile_stop` after

**For "X is not visible" bugs**, trace the data path:
1. Identify the API call via `browser_network_requests`
2. Read the route handler and trace the data source
3. Find the lifecycle gap: _"When would this data NOT be populated?"_ — common gaps:
   data seeded only at boot, not initialized for new spaces

Write `reproduction-report.md` to the Kibana repo root:

```markdown
# Reproduction Report

**Issue**: #<number>
**Status**: reproduced | not_reproduced
**User acknowledged**: pending

## Findings
- **Failing endpoint**: <url and method>
- **Console errors**: <list>
- **Component**: <name>
- **Data path trace**: <route → service → data source>
- **Root cause hypothesis**: <initial hypothesis>
```

Present the report to the user and wait for their response before doing anything else.
This is a required stop — the user must review what the browser showed before
investigation turns into implementation.

- Bug reproduced → update `user_acknowledged` to `yes` once the user responds, signal to
  the orchestrator that Phase A is complete
- Could not reproduce → set `status` to `not_reproduced`, tell the user what you tried
  and observed, ask how to proceed. Do not signal completion.
