# Phase 0: Setup

**Start this phase immediately — environment boot runs while input is parsed.**

---

## Prerequisites

Before starting, verify these are in place:

- **`gh` CLI** — `gh auth login`
- **playwright-mcp** — add to `~/.claude/mcp.json` and restart Claude Code:
  ```json
  { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
  ```
- **Skill symlink** (from repo root, then restart your IDE):
  ```bash
  SKILL=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester
  ln -s "$(pwd)/$SKILL" ~/.claude/skills/exploratory-tester
  ```
- **Scout** (agent-managed environments only) — `node scripts/scout.js` available. Run `yarn kbn bootstrap` if not.

---

## Step 0a — Start or verify environment

Determine environment type. Default is `stateful-classic` if no `Environment` section is in the input.

**Agent-managed** (`Environment.url` is absent):

| `Environment.type` | Command |
|---|---|
| `stateful-classic` (default) | `node scripts/scout.js start-server --arch stateful --domain classic &` |
| `stateful-ess` | `node scripts/scout.js start-server --arch stateful --domain ess &` |
| `serverless` | `node scripts/scout.js start-server --arch serverless --projectType <project-type> &` |

If Scout is already running on port 5620 — reuse it. Tell the user an existing session is being reused.

**User-provided** (`Environment.url` is present — append to invocation):
```
Environment:
  url: $KIBANA_TEST_URL
  username: $KIBANA_TEST_USERNAME
  password: $KIBANA_TEST_PASSWORD
  data-setup: skip    # omit to run data setup
  space: <id>         # omit to use "exploratory-testing"
```
Skip Scout startup. Verify connectivity:
```bash
curl -s -u "<username>:<password>" "<url>/api/status" \
  | python3 -c "import sys,json; s=json.load(sys.stdin); \
    exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"
```
If unreachable — **stop** and tell the user to check the environment.

Resolve env var references in credentials (`$VAR` → environment variable value) before using them.

**Failures:**
- Scout not available within 10 min → **Stop.** Tell user to check `node scripts/scout.js start-server` logs.
- User-provided environment unreachable → **Stop.** Tell user to check URL and credentials.

---

## Step 0b — Parse input

**Inline mode:** extract `Area`, `Flows`, `Setup`, `Environment`, `Specs`, `Session-timeout`, and `mode` directly from the invocation text.

For each flow, parse optional sub-fields: `entry:`, `expected:`, `timeout:` (minutes, default 4).

**Assigning `source` to each flow:**
- `"specified"` — came from the invocation `Flows:` block or from `## Exploratory testing scope` on a GitHub issue/PR.
- `"agent"` — added by the agent (adjacent paths, edge cases, regression checks). Max **2–3** agent flows per session. Prefer: permission boundary checks, adjacent pages sharing a component, error recovery paths. Never duplicate a specified flow's intent.

**GitHub mode:**
```bash
# For issue:
gh issue view <NUMBER> --repo elastic/kibana --json number,title,body,comments
# For PR:
gh pr view <NUMBER> --repo elastic/kibana --json number,title,body,comments
```

Find the **latest** comment containing `## Exploratory testing scope`. Parse `### Area`, `### Flows`, `### Setup`, `### Environment`, `### Specs`.

If no `## Exploratory testing scope` comment is found — **stop** and show the user this format:
```markdown
## Exploratory testing scope

### Area
<feature area name>

### Flows
- <flow name>
  entry: <navigation path — optional>
  expected: <correct outcome — optional>
  timeout: <minutes — optional, default 4>

### Setup
- <connector or role requirement, one per line>

### Specs
<URL or file path to PRD / acceptance criteria / design doc — optional>
```

**Failures:**
- `gh` returns authentication error → **Stop.** Tell user to run `gh auth login`.
- No `## Exploratory testing scope` comment → **Stop.** Show format above.

---

## Step 0c — Resolve role and area slug

**Area slug:** lowercase the Area value, replace spaces with hyphens.
`"SIEM Migrations dashboards"` → `siem-migrations-dashboards`

**Role resolution — never use `admin` for exploration.** If the scope requests `admin`, substitute and warn: _"Role 'admin' is not allowed — substituting with `<platform_engineer | t2_analyst>`."_

| Scope role | Stateful | Serverless |
|---|---|---|
| `t1_analyst` | `t1_analyst` | `viewer` |
| `t2_analyst` | `t2_analyst` | `editor` |
| `platform_engineer` | `platform_engineer` | `platform_engineer` |
| `admin` | ⚠️ → `t2_analyst` | ⚠️ → `platform_engineer` |
| Unrecognised | warn → `viewer`, add to `skipped_setup` | warn → `viewer`, add to `skipped_setup` |

---

## Step 0d — Fetch known bugs

Extract 2–3 distinctive words from the area name, skipping articles and prepositions (a, an, the, for, in, and, with, of). Example: "Security Solution data view picker" → `"security solution data view"`.

```bash
KEYWORDS="<2-3 distinctive words from area name>"
gh issue list --repo elastic/kibana --state open \
  --search "$KEYWORDS" \
  --json number,title,labels --limit 10
gh issue list --repo elastic/kibana --state closed \
  --search "$KEYWORDS" \
  --json number,title,closedAt --limit 5
```

---

## Step 0e — Write config.json

```bash
mkdir -p .exploratory-session
date -u +"%Y-%m-%dT%H:%M:%SZ"   # capture session_started_at
```

If `.exploratory-session/config.json` already exists — ask the user: **"An existing session config was found. Reuse it (r) or start fresh (f)?"** Wait for their answer.

- **Reuse (r):** Trust `config.json` as-is. Skip remaining Phase 0 steps and all of Phase 1. Jump to Phase 2. Existing `findings-flow-<N>.md` files are included in Phase 3.
- **Start fresh (f):** `rm -f .exploratory-session/findings-flow-*.md`. Overwrite `config.json` and continue.

Write `.exploratory-session/config.json`:
```json
{
  "area": "<area name from input>",
  "area_slug": "<area-slug>",
  "mode": "<single | parallel>",
  "environment": {
    "type": "<stateful-classic | stateful-ess | serverless | user-provided>",
    "url": "<resolved url>",
    "es_url": "<elasticsearch url — replace kb. with es. for ECH>",
    "managed": true,
    "data_setup": "<run | skip>",
    "space_id": "exploratory-testing"
  },
  "test_user": {
    "username": "exploratory-tester",
    "password": "Exploratory123!"
  },
  "flows": [
    {
      "name": "<flow name>",
      "entry": "<entry path or null>",
      "expected": "<expected outcome or null>",
      "timeout_minutes": 4,
      "source": "<specified | agent>"
    }
  ],
  "setup": {
    "connectors": ["<connector names>"],
    "role": "<scope role>",
    "resolved_role": "<resolved role — never admin>"
  },
  "specs": "<URL or file path provided in Specs: field, or null if not provided>",
  "specs_fallback": "https://www.elastic.co/docs/solutions/security",
  "session_timeout_minutes": 90,
  "skipped_setup": [],
  "noise_index": null,
  "known_open_bugs": [{ "number": 0, "title": "" }],
  "recently_closed_bugs": [{ "number": 0, "title": "", "closedAt": "" }],
  "session_started_at": "<ISO timestamp>"
}
```

`data_setup` is `"skip"` when the invocation includes `data-setup: skip`; otherwise `"run"`.

For **user-provided environments**: `space_id` defaults to `"exploratory-testing"`. `test_user` is omitted — provided credentials are used directly throughout.

Read `knowledge/<area_slug>.md` if it exists — load as context for Phase 2.
