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
| **1 — Wait & Login** | Wait for Kibana ready, log in, set up data, verify area readiness, confirm scope with user | User confirms: proceed |
| **2 — Explore** | Walk every flow using checklist + timebox, write findings immediately | Every flow has ≥1 entry in its `findings-flow-<N>.md` |
| **3 — Report** | Merge findings, classify, filter known noise, present to user, update knowledge | User has reviewed the report |

## Prerequisites

- **`gh` CLI** — authenticated (`gh auth login`)
- **playwright-mcp** — add to `~/.claude/mcp.json` and restart Claude Code:
  ```json
  { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
  ```
- **Skill symlinks** (run from repo root, then restart your IDE):
  - **Claude Code**:
    ```bash
    SKILL=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester
    ln -s "$(pwd)/$SKILL" ~/.claude/skills/exploratory-tester
    ```
  - **Cursor**:
    ```bash
    SKILL=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester
    ln -s "$SKILL" .agents/skills/exploratory-tester
    ```
- **Scout** (agent-managed environments only) — `node scripts/scout.js` must be available. Run `yarn kbn bootstrap` if not already done.

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
    timeout: 8
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

For each flow, parse optional sub-fields: `entry:`, `expected:`, `timeout:` (minutes, default 4).

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
- `### Flows` → list (each item may have `entry:`, `expected:`, `timeout:` sub-fields)
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
  timeout: <minutes — optional, default 4>

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

- **Reuse (r):** Trust `config.json` as-is. Skip Phase 0 remaining steps and all of Phase 1. Jump directly to Phase 2. Existing `findings-flow-<N>.md` files are kept and will be included in Phase 3's merge.
- **Start fresh (f):** Delete all `.exploratory-session/findings-flow-*.md` files. Overwrite `config.json` with the newly parsed input and continue.

Write `.exploratory-session/config.json`:
```json
{
  "area": "<area name from input>",
  "area_slug": "<area-slug>",
  "mode": "<single | parallel>",
  "environment": {
    "type": "<stateful-classic | stateful-ess | serverless | user-provided>",
    "url": "<resolved url>",
    "managed": true,
    "data_setup": "<run | skip>"
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

`data_setup` is `"skip"` when the invocation includes `data-setup: skip` in the Environment block; otherwise `"run"`.

Read `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md` if it exists — load its contents as context for Phase 2.

---

## Phase 1: Wait & Login

### Step 1a — Wait for Kibana (agent-managed only)

Skip this step if `environment.managed` is `false` in `config.json`.

```bash
node -e "
(async () => {
  const creds = Buffer.from('elastic:changeme').toString('base64');
  for (let i = 1; i <= 60; i++) {
    try {
      const r = await fetch('http://localhost:5620/api/status',
        { headers: { Authorization: 'Basic ' + creds } });
      const s = await r.json();
      if (s?.status?.overall?.level === 'available') {
        process.stdout.write('Kibana ready\n'); process.exit(0);
      }
    } catch(e) {}
    process.stdout.write('Attempt ' + i + ' — waiting 10s...\n');
    await new Promise(r => setTimeout(r, 10000));
  }
  process.stderr.write('Kibana not ready after 10 minutes\n'); process.exit(1);
})();
"
```

If the script exits with code 1 — **stop** and tell the user to check the Scout server output.

### Step 1b — Log in via browser

**Login URL:**
- Agent-managed (`stateful-classic`, `stateful-ess`, `serverless`): navigate to `<environment.url>/login?auth_provider_hint=cloud-basic`
- User-provided: navigate to `<environment.url>/login` (no hint). If the page does not show username/password fields, retry with `?auth_provider_hint=cloud-basic`. If login still fails — **stop** and tell the user to check the auth provider configuration.

Fill credentials:
- Agent-managed environments: username `elastic`, password `changeme`
- User-provided environments: username and password from `config.json` environment block

If login fails — retry once with a fresh navigation. If still failing — **stop** and report the exact error message visible in the browser.

**After login completes**, check for blocking dialogs (onboarding modals, feedback surveys, announcement banners). For each one:
1. Dismiss it: press `Escape`, or click any visible `Not now`, `Skip`, `Dismiss`, or `Close` button
2. Log a Level 3 observation describing the dialog title and dismiss method

### Step 1c — Set up test data

Skip this step entirely if `environment.data_setup` is `"skip"` in `config.json`.

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
```json
{ "step": "esArchiver:<fixture-name>", "reason": "not supported in serverless: <error>" }
```

**Roles and users (stateful only):**

Create the test role and user via the security API. For serverless, skip role/user creation entirely — the `resolved_role` from `config.json` is the project-level role that was already mapped. Add to `skipped_setup`:
```json
{ "step": "role-creation:<role>", "reason": "serverless uses project roles — resolved to <resolved_role>" }
```

### Step 1d — Check area readiness

Navigate to the first flow's `entry` path. Call `browser_snapshot` to see the current state.

If the page shows an empty state (e.g., "No migrations to view", "No data", empty illustration with a CTA):

1. **Attempt to create the required data automatically:**
   - Look for visible `Create`, `Add`, `Import`, or `Get started` CTAs and follow them
   - Try the area's onboarding flow if it is accessible from the current page
   - Use any seed API endpoints listed in the scope `Setup` section

2. After each creation attempt, navigate back to the entry path and re-check with `browser_snapshot`

3. If data was created successfully — continue to Step 1e

4. If the agent cannot determine how to create the data — **stop** and tell the user:
   > "The area shows an empty state and I couldn't find a way to create the required data automatically. Can you tell me how to set it up, or should I explore the empty state instead?"

   Wait for their answer before continuing.

### Step 1e — Confirm with user

Present a confirmation before starting exploration:

> "Kibana ready (`<environment.type>` at `<environment.url>`).
> Exploring **`<area>`** with role **`<resolved_role>`**.
> Flows: `<flow names, comma-separated>`
> Skipped setup: `<skipped_setup list, or 'none'>`
> Proceed?"

Wait for the user's reply before moving to Phase 2.

---

## Phase 2: Explore

### Single mode

For each flow in `config.json` flows array (in order), run the Explore Loop below. Do not move to the next flow until the current one is complete.

### Parallel mode

The orchestrator dispatches one sub-agent per flow concurrently.

**Orchestrator steps:**
1. Read `config.json` — confirm `mode` is `parallel`
2. Assign each flow an index N (1-based)
3. Dispatch sub-agents concurrently via the Agent tool. Each sub-agent prompt must include:

```
First, read the skill file at:
x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md

You are a sub-agent for the exploratory-tester skill.
Your task: run the Explore Loop (defined in Phase 2 of that skill) for this single flow.

Flow: <flow object as JSON>
config.json path: .exploratory-session/config.json
findings file path: .exploratory-session/findings-flow-<N>.md
knowledge file path: x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md

Read config.json for environment details, resolved_role, area, and known_open_bugs.
Read the knowledge file if it exists — use it to recognise known non-bugs.
Run the Explore Loop for your assigned flow.
Write all findings to findings-flow-<N>.md.
Do NOT write to the knowledge file.
Exit when the flow is complete or the timebox expires.
```

4. Wait for all sub-agents to complete
5. If a sub-agent crashes or does not produce a findings file: create `findings-flow-<N>.md` with a single entry:

```markdown
## Finding: Sub-agent failure

**Level:** 3
**Flow:** <flow name>
**Role:** <resolved_role>
**Checklist step:** N/A

### Current behavior
Sub-agent did not complete. No findings collected for this flow.
```

6. Proceed to Phase 3 once all findings files exist (one per flow)

**Sub-agent rules:**
- Sub-agents are stateless — they read `config.json` and the knowledge file, write their findings file, and exit
- Sub-agents read `knowledge/<area_slug>.md` but **never write to it**
- A sub-agent crashing does not block other sub-agents

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
| 5 | **Refresh during in-flight operation** — start the flow, trigger a server call, call `browser_snapshot` to confirm the loading state is visible, then navigate to the same URL to simulate a refresh |

**At every checklist step, before and after the action:**
1. `browser_console_messages` — capture any new messages
2. `browser_network_requests` — capture requests triggered by the action
3. `browser_take_screenshot` — save to `.exploratory-session/screenshots/<area_slug>-flow<N>-step<M>-<checklist-step-slug>.png` (e.g. `siem-migrations-dashboards-flow1-step1-happy-path.png`)
4. Append one entry to `findings-flow-<N>.md` **immediately** — even if nothing went wrong

**How to navigate to the flow:**
1. Use `entry` from `config.json` if provided — navigate exactly as described
2. After navigation, verify the resulting URL contains the expected area path. If you were redirected to an unrelated page (e.g. `/get_started`, `/overview`): log a Level 2 finding with the redirect chain, then try navigating to a more specific sub-path that matches the `entry` description
3. If no `entry`: call `browser_snapshot`, read the visible UI, navigate to the area from what's on screen
4. Check `knowledge/<area_slug>.md` for navigation patterns accumulated from prior sessions
5. If the flow name is still ambiguous after the snapshot: take a screenshot, describe what you see, choose the most reasonable interpretation and proceed — never skip

**If timebox fires before checklist completes:** log remaining steps as:
```
skipped: time budget exhausted (N minutes elapsed)
```

**If checklist completes before timebox:** probe one or two unexpected UI states noticed during the checklist, or follow a single hint from findings so far. Do not start new flows or navigate to unrelated areas.

**If the browser session is lost mid-flow:** log findings collected so far, mark remaining checklist steps as `skipped: session lost`, continue with the next flow.

---

## Finding Format

Each entry appended to `.exploratory-session/findings-flow-<N>.md`:

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
- Screenshot: `.exploratory-session/screenshots/<area_slug>-flow<N>-step<M>-<checklist-step-slug>.png`
- Console: `<relevant line — one line>` — relevant = appeared after the triggering action AND contains error/exception keywords or HTTP 5xx; ignore CSP violations, 404s on `/internal/cloud/solution`, browser extension messages
- Network: <METHOD> `<path>` → <status> `<relevant response snippet>`
```

**Level rules:**
- **Level 1** — JS exception in console, HTTP 5xx on any in-flow request, a 2xx response whose body contains an `error` key, a toast notification with error/failure wording, or current behavior directly contradicts the `expected` field in `config.json` → agent decides: confirmed bug
- **Level 2** — Unexpected 4xx, element that should be present is missing, layout visibly broken, action completes with no user feedback, or a loading indicator that hasn't resolved after 10 seconds → agent flags: user decides
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

---

## Phase 3: Report

### Step 3a — Merge findings

Read all `.exploratory-session/findings-flow-<N>.md` files. Write `.exploratory-session/report.md`:

```markdown
# Exploratory Testing Report

**Area:** <area>
**Environment:** <environment.type> at <environment.url>
**Role:** <resolved_role>
**Date:** <today's date>
**Mode:** <single | parallel>
**Flows explored:** <N>

## Summary
- Level 1 (confirmed bugs): N
- Level 2 (suspicious — your review needed): N
- Level 3 (observations): N
- Skipped (time budget / session lost): N
- Known / suppressed: N

## Level 1 — Confirmed Bugs
<all Level 1 findings in full finding format>

## Level 2 — Suspicious
<all Level 2 findings in full finding format>

## Level 3 — Observations
<all Level 3 findings in short observation format>

## Skipped
| Flow | Checklist step | Reason |
|---|---|---|
| <flow name> | <step> | time budget exhausted / session lost |

## Known / Suppressed
| Finding | Reason suppressed |
|---|---|
| <title> | Matches knowledge/<area_slug>.md: "<entry>" |
| <title> | Matches known open bug #<number>: "<title>" |
```

### Step 3b — Filter known noise

For each Level 2 and Level 3 finding, check in this order:
1. Does it match an entry in `knowledge/<area_slug>.md`? If yes → move to "Known / Suppressed", cite the matching entry
2. Does it match a `known_open_bugs` entry in `config.json`? If yes → move to "Known / Suppressed", cite the issue number

**Never silently drop a finding.** Every suppressed finding must appear in "Known / Suppressed" with the reason.

Level 1 findings are never suppressed by the knowledge file — a confirmed bug is always reported.

### Step 3c — Present report

Present `report.md` to the user and ask:

> "Review complete. Are there any Level 2 or Level 3 findings you want to reclassify as false positives before I update the knowledge file?"

Wait for the user's response. Apply any reclassifications to `report.md`.

### Step 3d — Update knowledge file

After user review, update `knowledge/<area_slug>.md`.

If the file does not exist, create it at:
`x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md`

With this initial structure:
```markdown
# Knowledge: <area name>

## Known non-bugs
<!-- Behaviours the agent should not re-report as findings -->

## Navigation patterns
<!-- How to reach features in this area — built up across sessions -->
```

Append confirmed false positives (findings the user dismissed or reclassified) to `## Known non-bugs`. Append any navigation patterns discovered during this session that weren't already in the file to `## Navigation patterns`.

If the file exceeds 100 lines, archive the current content to `knowledge/<area_slug>-archive-<date>.md`, start fresh with the initial structure above, and copy the most recently added entries from each section to the new file.

Commit the knowledge file:
```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md
git commit -m "knowledge(exploratory-tester): update <area_slug> after session on <date>"
```

---

## Failure Handling

| Failure | When | Response |
|---|---|---|
| Scout server not available within 10 minutes | Phase 1 (agent-managed) | **Stop.** Tell user to check Scout server output (`node scripts/scout.js start-server` logs). |
| Scout already running on port 5620 | Phase 0 (agent-managed) | Reuse. Tell user an existing session is being reused. |
| User-provided environment unreachable | Phase 0 | **Stop.** Tell user to check the environment URL and credentials. |
| Login fails after one retry | Phase 1 | **Stop.** Report the exact error visible in the browser. |
| `gh` CLI not authenticated | Phase 0 (GitHub mode) | **Stop.** Tell user to run `gh auth login`. |
| No `## Exploratory testing scope` comment found | Phase 0 (GitHub mode) | **Stop.** Show the exact comment format to add (see Phase 0 Step 0b). |
| Sub-agent crashes in parallel mode | Phase 2 | Continue with other flows. Mark the crashed flow as `failed: sub-agent error` in the report. |
| Browser session lost mid-exploration | Phase 2 | Log findings collected so far. Mark remaining checklist steps as `skipped: session lost`. Continue with next flow. |
| `config.json` already exists | Phase 0 | Ask user: reuse existing session or start fresh? Wait for answer. |
| esArchiver load fails in serverless | Phase 1 | Skip. Add `{ "step": "esArchiver:<name>", "reason": "<error>" }` to `skipped_setup`. Continue. |
| Role unrecognised in serverless | Phase 0 | Warn user. Use `viewer`. Add `{ "step": "role-creation:<role>", "reason": "unrecognised role — defaulted to viewer" }` to `skipped_setup`. |
| Area shows empty state, agent can't create data | Phase 1 | Describe empty state to user. Ask: create data manually, explore the empty state, or abort. |
