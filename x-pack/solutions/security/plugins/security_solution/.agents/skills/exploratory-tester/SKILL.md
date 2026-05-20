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

---

## Phase 1: Wait & Login

### Step 1a — Wait for Kibana (agent-managed only)

Skip this step if `environment.managed` is `false` in `config.json`.

```bash
until curl -s -u elastic:changeme http://localhost:5620/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); \
    exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)" \
  2>/dev/null; do echo "Waiting for Kibana..."; sleep 10; done
```

If not available after **10 minutes** — **stop** and tell the user to check the Scout server output.

### Step 1b — Log in via browser

Navigate to `<environment.url>/login?auth_provider_hint=cloud-basic`.

Fill credentials:
- Agent-managed environments: username `elastic`, password `changeme`
- User-provided environments: username and password from `config.json` environment block

If login fails — retry once with a fresh navigation. If still failing — **stop** and report the exact error message visible in the browser.

### Step 1c — Set up test data

Check environment capabilities before each step. Record every skipped step in `config.json` → `skipped_setup` with its reason.

**Connectors (all environment types):**
```bash
# Create Bedrock connector (stateful):
curl -s -u elastic:changeme -X POST http://localhost:5620/api/actions/connector \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"name":"Bedrock","connector_type_id":".bedrock","config":{"apiUrl":"https://bedrock.us-east-1.amazonaws.com"},"secrets":{"accessKey":"test","secret":"test"}}'
```
For user-provided environments: replace URL and credentials. For serverless: same endpoint, credentials from config.

**esArchiver fixtures (stateful environments only):**

If the scope `Setup` section lists esArchiver fixtures, load them via the Kibana API. For serverless, attempt the load — if the response is 404 or 400, skip and add to `skipped_setup`:
```
{ "step": "esArchiver:<fixture-name>", "reason": "not supported in serverless: <error>" }
```

**Roles and users (stateful only):**

Create the test role and user via the security API. For serverless, skip role/user creation entirely — the `resolved_role` from `config.json` is the project-level role that was already mapped. Add to `skipped_setup`:
```
{ "step": "role-creation:<role>", "reason": "serverless uses project roles — resolved to <resolved_role>" }
```

### Step 1d — Confirm with user

Present a confirmation before starting exploration:

> "Kibana ready (`<environment.type>` at `<environment.url>`).
> Exploring **`<area>`** with role **`<resolved_role>`**.
> Flows: `<flow names, comma-separated>`
> Skipped setup: `<skipped_setup list, or 'none'>`
> Proceed?"

Wait for the user's reply before moving to Phase 2.

In `mode: auto` — skip this confirmation. Proceed immediately.

---

## Phase 2: Explore

### Single mode

For each flow in `config.json` flows array (in order), run the Explore Loop below. Do not move to the next flow until the current one is complete.

### The Explore Loop (per flow)

**Termination: mandatory checklist complete OR timebox expired — whichever fires first.**

Default timebox: `timeout_minutes` from the flow in `config.json` (default 4 minutes). Track elapsed time from the first checklist step.

**Mandatory checklist — attempt in this order:**

| Step | What to attempt |
|---|---|
| 1 | **Happy path** — execute the flow exactly as intended |
| 2 | **Missing prerequisites** — remove one required setup item (e.g. delete the connector) and retry |
| 3 | **Invalid/edge-case input** — empty strings, special characters (`'`, `"`, `<`, `>`), max length, wrong type |
| 4 | **Cancel / back-navigate mid-flow** — start the flow, then cancel or navigate away before completion |
| 5 | **Refresh during in-flight operation** — start the flow, trigger a server call, immediately refresh the page |

**At every checklist step, before and after the action:**
1. `browser_console_messages` — capture any new messages
2. `browser_network_requests` — capture requests triggered by the action
3. `browser_take_screenshot` — capture the resulting UI state
4. Append one entry to `findings-flow-N.md` **immediately** — even if nothing went wrong (record what was attempted and what happened)

**How to navigate to the flow:**
1. Use `entry` from `config.json` if provided — navigate exactly as described
2. If no `entry`: call `browser_snapshot`, read the visible UI, navigate to the area from what's on screen
3. Check `knowledge/<area_slug>.md` for navigation patterns accumulated from prior sessions
4. If the flow name is still ambiguous after the snapshot: take a screenshot, describe what you see, choose the most reasonable interpretation and proceed — never skip

**If timebox fires before checklist completes:** log remaining steps as:
```
skipped: time budget exhausted (N minutes elapsed)
```

**If checklist completes before timebox:** probe one or two unexpected UI states noticed during the checklist, or follow a single hint from findings so far. Do not start new flows or navigate to unrelated areas.

**If the browser session is lost mid-flow:** log findings collected so far, mark remaining checklist steps as `skipped: session lost`, continue with the next flow.

---

## Finding Format

Each entry appended to `.exploratory-session/findings-flow-N.md`:

```markdown
## Finding: [short descriptive title]

**Level:** <1 | 2 | 3>
**Flow:** <flow name from config.json>
**Role:** <resolved_role from config.json>
**Checklist step:** <N — step description>

### Steps followed
1. <exact action — literal, not a summary>
2. <exact action>

### Current behavior
<what actually happened — include error messages verbatim, HTTP status codes, console output>

### Expected behavior
<what should have happened — use config.json expected field, or state the heuristic used>

### Why this might be an issue
<mandatory for Level 1 and 2: commit to reasoning, explain user impact>

### Evidence
- Screenshot: `.exploratory-session/screenshots/<filename>.png`
- Console: `<relevant line — one line, not a dump>`
- Network: <METHOD> `<path>` → <status> `<relevant response snippet>`
```

**Level rules:**
- **Level 1** — JS exception in console, HTTP 5xx on any in-flow request, or current behavior directly contradicts the `expected` field in `config.json` under the same setup → agent decides: confirmed bug
- **Level 2** — Unexpected 4xx, element that should be present is missing, layout visibly broken, action completes with no user feedback → agent flags: user decides
- **Level 3** — `console.warn`, transient spinner, unclassifiable observation → listed, not flagged

**For Level 3 findings** — use this shorter format:
```markdown
## Observation: [title]

**Level:** 3
**Flow:** <flow name>
**Role:** <resolved_role>
**Checklist step:** <N — description>

### Current behavior
<what was observed>

### Evidence
- Console: `<line>`
```
