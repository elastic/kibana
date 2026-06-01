# Phase 2: Explore

---

## Single mode

For each flow in `config.json` in order, run the Explore Loop. Do not move to the next flow until the current one is complete.

---

## Parallel mode

The orchestrator dispatches one sub-agent per flow concurrently.

1. Read `config.json` — confirm `mode` is `parallel`
2. Assign each flow an index N (1-based)
3. Dispatch sub-agents concurrently via the Agent tool. Each sub-agent prompt must begin by reading the skill:

```
First, read the skill file at:
x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md

You are a sub-agent for the exploratory-tester skill.
Your task: run the Explore Loop (Phase 2 of that skill) for this single flow.

Flow: <flow object as JSON>
config.json path: .exploratory-session/config.json
findings file path: .exploratory-session/findings-flow-<N>.md
knowledge file path: x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md

Read config.json for environment details, resolved_role, space_id, test_user, area, and known_open_bugs.
Read the knowledge file if it exists — use it to recognise known non-bugs.
Run the Explore Loop. Write all findings to findings-flow-<N>.md.
Do NOT write to the knowledge file.
Exit when the flow is complete or the timebox expires.
```

4. Wait for all sub-agents to complete.
5. If a sub-agent crashes or produces no findings file, create `findings-flow-<N>.md` with:
   ```markdown
   ## Finding: Sub-agent failure
   **Level:** 3 | **Flow:** <flow name> | **Checklist step:** N/A
   ### Current behavior
   Sub-agent did not complete. No findings collected.
   ```
6. Proceed to Phase 3.

**Sub-agent rules:** stateless — reads `config.json` + knowledge file, writes findings file, exits. Never writes to the knowledge file. One crash does not block other sub-agents.

> **Pitfall:** Never describe the Explore Loop inline in the sub-agent prompt — the sub-agent must read SKILL.md itself.

---

## The Explore Loop (per flow)

**Termination: mandatory checklist complete OR timebox expired — whichever fires first.**

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"   # record flow start time
```

Record end time when checklist completes or timebox fires. Write both into the findings file header (see `templates/finding-format.md`).

### Mandatory checklist

| Step | What to attempt |
|---|---|
| 1 | **Happy path** — execute the flow exactly as intended |
| 2 | **Missing prerequisites** — remove one required setup item and retry |
| 3 | **Invalid/edge-case input** — empty strings, special chars (`'` `"` `<` `>`), max length, wrong type. **For flows using data views or index patterns:** also switch to the noise index (`config.json → noise_index`) and repeat the key action. Non-ECS field types and missing fields expose mapping assumptions clean data never triggers. Skip if noise index was not created (note it). |
| 4 | **Cancel / back-navigate mid-flow** — start the flow, then cancel or navigate away |
| 5 | **Refresh during in-flight operation** — trigger a server call, confirm loading state with `browser_snapshot`, then navigate to the same URL |

### At every checklist step

1. **`browser_console_messages`** — scan for new messages after the action:
   - `"Maximum update depth exceeded"` → **Level 1** (infinite render loop)
   - Any other `"Warning: ..."` React message → **Level 2**
   - Ignore: CSP violations, 404s on `/internal/cloud/solution`, browser extension messages
2. **`browser_network_requests`** — group by `method + path` (strip query strings). If any group has 2+ entries from a single user action → **Level 2** finding ("Duplicate API call"). Exclude polling paths (`/health`, `/status`, `/metrics`, `/fleet-setup`).
3. **`browser_take_screenshot`** — save to `.exploratory-session/screenshots/<area_slug>-flow<N>-step<M>-<checklist-step-slug>.png`
4. **Append one entry to `findings-flow-<N>.md` immediately** — even if nothing went wrong. Use `templates/finding-format.md`.

### Mini-probe (Level 1 or Level 2 finding)

Before moving to the next checklist step:
- Budget: **2 extra minutes** or 2 targeted actions, whichever fires first.
- Try 1–2 variations: different data item, adjacent navigation path, or related action. **When the finding involves a shared UI component** (picker, KPI card, data view selector), visiting 1–2 adjacent pages that use the same component is the highest-value probe — it distinguishes page-specific from systemic issues.
- Log new findings immediately (same flow, same step label, suffix "— mini-probe").
- Do **not** claim a new flow's timebox. If the parent flow's timebox fires during a mini-probe, stop and log remaining steps as `skipped: time budget exhausted`.

### When uncertain about expected behavior

Consult in order — stop when you have enough to proceed:
1. UI labels, tooltips, help text, onboarding copy visible in the browser
2. Official docs: `https://www.elastic.co/docs/solutions/security`
3. Cypress (`.cy.ts`) or functional test files — for intended user flows **only**. Never copy selectors, CSS classes, or `data-test-subj` values.
4. **Never source code** — React components, hooks, reducers, API handlers are off-limits. The implementation may itself be wrong.

### Navigation

All navigation must stay within the test space (`/s/<space_id>/`). Verify the URL after every navigation.

1. If `entry` starts with `/app/` → `<environment.url>/s/<space_id><entry>`
2. If `entry` starts with `/s/` → `<environment.url><entry>` as-is
3. If `entry` is a natural-language description → navigate from `/s/<space_id>/app/security` and follow the path
4. If redirected to an unrelated page or space prefix is missing → log a Level 2 finding, try a more specific sub-path
5. Check `knowledge/<area_slug>.md` for navigation patterns from prior sessions
6. If still ambiguous → take a screenshot, choose the most reasonable interpretation, proceed — never skip

**Pitfalls:**
- After `browser_navigate` in Security Solution, a side panel may re-open as a blocking dialog (e.g. "Admin and settings"). Check the first snapshot for an open `dialog` and press `Escape` before any other action.
- `browser_navigate` times out when a `beforeunload` dialog is blocking (e.g. Timeline with unsaved changes). If navigation times out, call `browser_snapshot`. If a dialog is present, call `browser_handle_dialog(accept: true)` then retry.
- After 2 failed attempts to type into a Monaco editor, log "partial interaction — Monaco editor prevented automated input" and move on.

### Timebox outcomes

- **Timebox fires before checklist completes:** log remaining steps as `skipped: time budget exhausted (N minutes elapsed)`
- **Checklist completes before timebox:** probe 1–2 unexpected UI states noticed during the checklist. Do not start new flows.
- **Browser session lost:** log findings so far, mark remaining steps as `skipped: session lost`, continue with next flow.

### Logging discipline

- `console.warn` is **Level 3**. Only React `Warning:` messages and error-level output are Level 2+.
- One finding per unique `method + path` pair per flow — do not repeat a duplicate API call finding at every checklist step.
- Use `.exploratory-session/` for any temp files needing upload — `browser_file_upload` only accepts repo-relative paths.
