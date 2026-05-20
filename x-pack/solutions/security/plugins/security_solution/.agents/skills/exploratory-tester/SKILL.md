---
name: exploratory-tester
description: >
  Use when the user wants to perform exploratory testing on Kibana Security Solution.
  Invoke inline with an area and flows, or point at a GitHub issue/PR number that contains
  an "## Exploratory testing scope" comment.
  Supports stateful-classic, stateful-ess, and serverless environments — agent-managed or user-provided.
---

# Exploratory Tester

Explore a feature area of Kibana Security Solution through the browser, collect structured evidence, and report findings classified by confidence. The agent drives a real browser — not code analysis or API calls.

**Execute phases 0 → 1 → 2 → 3 in strict order.** Each phase produces artefacts the next depends on. Never skip a phase.

## Quick Reference

| Phase | What it does | Exit condition |
|-------|-------------|----------------|
| **0 — Setup** | Parse scope, start environment (agent-managed) or verify (user-provided), fetch known bugs, write `config.json` | `config.json` written |
| **1 — Wait & Login** | Wait for Kibana ready, log in, set up data, confirm scope with user | User confirms: proceed |
| **2 — Explore** | Walk every flow using checklist + timebox, write findings immediately | Every flow has ≥1 entry in its `findings-flow-N.md` |
| **3 — Report** | Merge findings, classify, filter known noise, present to user, update knowledge | User has reviewed the report |

## How to invoke

**Inline — single mode (default):**
```
Read and follow exploratory-tester/SKILL.md
Area: SIEM Migrations dashboards
Flows:
  - rename with special characters
  - cancel mid-progress
    entry: SIEM Migrations > Dashboards > click rename on any migration card
    expected: migration returns to previous state, no orphaned process
Setup: Bedrock connector, role: t1_analyst
```

**Inline — parallel mode:**
```
Read and follow exploratory-tester/SKILL.md in parallel mode
Area: ...
```

**GitHub issue or PR:**
```
Read and follow exploratory-tester/SKILL.md for issue #12345
Read and follow exploratory-tester/SKILL.md in parallel mode for PR #12345
```

**With explicit environment (append to either form above):**
```
# Agent-managed non-default:
Environment:
  type: serverless
  project-type: security

# User-provided:
Environment:
  url: $KIBANA_TEST_URL
  username: $KIBANA_TEST_USERNAME
  password: $KIBANA_TEST_PASSWORD
  data-setup: skip
```

## Red Flags — Stop and re-read the phase

| If you're thinking this... | Reality |
|---|---|
| "This area looks fine — I didn't find anything" | Did you attempt every checklist step for every flow? |
| "I know what this component does from the source" | The code says what should happen; the browser says what does. |
| "This error always shows up, it's expected" | Document it. The user decides — then add it to `knowledge/<area-slug>.md`. |
| "I called the API directly and it works" | UI and API hit different code paths. Browser reproduction is required. |
| "The flow name is ambiguous — I'll skip it" | Use browser discovery: take a snapshot and navigate from what you see. |

---

## Phase 0: Setup

**Start this phase immediately — environment boot runs while input is parsed.**

### Step 0a — Start or verify environment

Determine environment type. Default is `stateful-classic` if no `Environment` section is in the input.

**Agent-managed** (`Environment.url` is absent):

| `Environment.type` | Command |
|---|---|
| `stateful-classic` (default) | `node scripts/scout.js start-server --arch stateful --domain classic &` |
| `stateful-ess` | `node scripts/scout.js start-server --arch stateful --domain ess &` |
| `serverless` | `node scripts/scout.js start-server --arch serverless --projectType <project-type> &` |

If Scout is already running on port 5620 — reuse it. Tell the user an existing session is being reused.

**User-provided** (`Environment.url` is present): skip Scout startup. Verify connectivity:
```bash
curl -s -u "<username>:<password>" "<url>/api/status" \
  | python3 -c "import sys,json; s=json.load(sys.stdin); \
    exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"
```
If unreachable — **stop** and tell the user to check the environment.

Resolve env var references in credentials (`$VAR` → environment variable value) before using them.

### Step 0b — Parse input

**Inline mode:** extract `Area`, `Flows`, `Setup`, `Environment`, and `mode` directly from the invocation text.

**GitHub mode:**
```bash
# For issue:
gh issue view <NUMBER> --repo elastic/kibana --json number,title,body,comments
# For PR:
gh pr view <NUMBER> --repo elastic/kibana --json number,title,body,comments
```

If `gh` returns an authentication error — **stop** and tell the user to run `gh auth login`.

Find the **latest** comment whose body contains `## Exploratory testing scope`. Parse:
- `### Area` → area name
- `### Flows` → list (each item may have `entry:` and `expected:` sub-fields)
- `### Setup` → connector and role requirements
- `### Environment` → optional, same keys as inline

If no `## Exploratory testing scope` comment is found — **stop** and show the user this exact format:

```markdown
## Exploratory testing scope

### Area
<feature area name>

### Flows
- <flow name>
  entry: <navigation path — optional>
  expected: <correct outcome — optional>

### Setup
- <connector or role requirement, one per line>
```

### Step 0c — Resolve role and area slug

**Area slug:** lowercase the Area value, replace spaces with hyphens.
`"SIEM Migrations dashboards"` → `siem-migrations-dashboards`

**Role resolution for serverless environments:**

| Scope role | Serverless project role |
|---|---|
| `t1_analyst` | `viewer` |
| `t2_analyst` | `editor` |
| `admin` | `admin` |
| Any unrecognised role | Warn user, use `viewer`, add to `skipped_setup` |

For stateful environments: use the scope role as-is.

### Step 0d — Fetch known bugs

```bash
gh issue list --repo elastic/kibana --state open \
  --search "<area keywords from area name>" \
  --json number,title,labels --limit 10
gh issue list --repo elastic/kibana --state closed \
  --search "<area keywords from area name>" \
  --json number,title,closedAt --limit 5
```

### Step 0e — Write config.json

Create `.exploratory-session/` if it doesn't exist.

If `.exploratory-session/config.json` already exists — ask the user: **"An existing session config was found. Reuse it (r) or start fresh (f)?"** Wait for their answer.

Write `.exploratory-session/config.json`:
```json
{
  "area": "<area name from input>",
  "area_slug": "<area-slug>",
  "mode": "<single | parallel>",
  "environment": {
    "type": "<stateful-classic | stateful-ess | serverless | user-provided>",
    "url": "<resolved url>",
    "managed": true
  },
  "flows": [
    {
      "name": "<flow name>",
      "entry": "<entry path or null>",
      "expected": "<expected outcome or null>",
      "timeout_minutes": 4
    }
  ],
  "setup": {
    "connectors": ["<connector names>"],
    "role": "<scope role>",
    "resolved_role": "<resolved role>"
  },
  "skipped_setup": [],
  "known_open_bugs": [{ "number": 0, "title": "" }],
  "recently_closed_bugs": [{ "number": 0, "title": "", "closedAt": "" }]
}
```

Read `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md` if it exists — load its contents as context for Phase 2.
