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

Start the Scout server in the background immediately — it takes 5+ minutes to boot and
can warm up while analysis runs:

```bash
node scripts/scout.js start-server --arch stateful --domain classic &
```

Feature flags won't be known until the ticket is parsed. If `server_args` turn out to be
non-empty, Phase 1 will stop and restart with the config set — one restart costs far less
than waiting for the server after analysis finishes.

If `analysis.json` already exists at the repo root from a prior session, skip the fetch
and parse steps — but you still must execute Phases 1, 2, and 3 in full. A prior analysis
does not substitute for a live reproduction. The environment must be started fresh and the
bug must be reproduced in the browser before any fix work begins.

The default repo is `elastic/kibana`. If the user provides only a number, fetch from there.
A different repo must be stated explicitly — don't search across repos.

```bash
gh issue view <NUMBER> --repo elastic/kibana \
  --json number,title,body,labels,comments,createdAt,state
```

Write `analysis.json` to the Kibana repo root with these fields:
- `classification` — bug pattern (see `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/classification-guide.md`)
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
- **Deployment type** — if the ticket is for a serverless environment, stop immediately
  and tell the user: this skill only supports stateful (ECH) environments. Serverless
  reproduction requires a different setup not covered here.

If anything is missing, tell the user what's needed and wait for an updated ticket.
A poorly specified ticket produces a misdiagnosed fix — it's faster to fix the ticket now.

If `possibly_fixed` is `true`, let the user know and get confirmation before continuing.

Dispatch these as subagents — PR diffs, issue threads, and source files are large, and
running them in parallel uses the server boot time productively:
- Read each `similar_issue` (`gh issue view <number> --repo elastic/kibana`)
- Review each `related_pr` diff (`gh pr diff <number> --repo elastic/kibana`)
- Search closed issues: `gh search issues "<key symptom>" --repo elastic/kibana --state closed --limit 5`
- Read `affected_paths` from `analysis.json` and study the relevant source code
- Read `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/references/classification-guide.md`
- Read `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/KNOWLEDGE.md`

Summarize findings before moving on.

## Phase 1: Start Services

The server has been booting since Phase 0. Check `server_args` from `analysis.json`:

**No feature flags** — just wait for ready:
```bash
until curl -s -u elastic:changeme http://localhost:5620/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)" 2>/dev/null; do
  echo "Waiting for Kibana..."; sleep 10
done
```

**With feature flags** — stop and restart with the config set:
```bash
pkill -f 'node.*scripts/scout' ; pkill -f 'org.elasticsearch'
mkdir -p config_sets/bug_fixer
cat > config_sets/bug_fixer/kibana.yml << 'EOF'
xpack.securitySolution.enableExperimental:
  - featureFlag1
feature_flags.overrides.some.flag: true
EOF
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet bug_fixer &
until curl -s -u elastic:changeme http://localhost:5620/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)" 2>/dev/null; do
  echo "Waiting for Kibana..."; sleep 10
done
```

The `config_sets/bug_fixer/kibana.yml` file is session-specific — write it from
`server_args` in `analysis.json` each time rather than editing any persistent config file.

Scout runs on port 5620 and sets up the `cloud-basic` auth provider needed for browser
reproduction. Don't use the plain dev server — `auth_provider_hint=cloud-basic` won't
work without Scout's server setup.

Stop services: `pkill -f 'node.*scripts/scout' ; pkill -f 'org.elasticsearch'`

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

**Login**: `http://localhost:5620/login?auth_provider_hint=cloud-basic` with `elastic` / `changeme`

1. `browser_navigate` → `http://localhost:5620/login?auth_provider_hint=cloud-basic`
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

- Bug reproduced → wait for the user to reply in the conversation, then set
  `user_acknowledged` to `yes`. This field must only be written after a real user reply —
  never pre-emptively. Writing it before the user responds is a protocol violation.
- Could not reproduce → set `status` to `not_reproduced`, tell the user what you tried
  and observed, ask how to proceed. Do not signal completion.
