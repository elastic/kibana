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

After each action, run the three detectors below **in sequence**. Each detector returns structured results — log them directly, no interpretation needed. Agent judgment applies only after the detectors have run, for UI states the detectors don't cover.

---

**Detector A — DOM state** (`browser_evaluate`)

Paste the full content of `scripts/check-dom-anomalies.js` as the function argument. Log each returned item at its indicated level:
- `level1[]` items → Level 1 finding
- `level2[]` items → Level 2 finding
- `level3[]` items → Level 3 observation

---

**Detector B — Console** (`browser_console_messages` → `browser_evaluate`)

1. Call `browser_console_messages(level: "error")` — collect the message texts.
2. Format them as a JSON string array: `["msg 1", "msg 2", ...]`
3. Call `browser_evaluate` with the content of `scripts/classify-console.js`, replacing the `/*MESSAGES*/` placeholder with the array:
   ```
   // Replace:  )(/*MESSAGES*/)
   // With:     )(["msg 1", "msg 2", ...])
   ```
4. Log each returned item at its indicated level. Do not log `suppressed[]` items.

---

**Detector C — Network** (`browser_network_requests` → `browser_evaluate`)

1. Call `browser_network_requests(static: false)` — parse each line of the form `N. [METHOD] https://... => [STATUS]` into `{method, url}`.
2. Format as a JSON array: `[{"method":"GET","url":"https://..."},...]`
3. Call `browser_evaluate` with the content of `scripts/dedup-network.js`, replacing `/*REQUESTS*/` with the array:
   ```
   // Replace:  )(/*REQUESTS*/)
   // With:     )([{"method":"GET","url":"https://..."}, ...])
   ```
4. Log each item in `findings[]` as a Level 2 finding.

---

**Screenshot:** `browser_take_screenshot` → `.exploratory-session/screenshots/<area_slug>-flow<N>-step<M>-<checklist-step-slug>.png`

**Append findings:** Write one entry to `findings-flow-<N>.md` per detector result (use `templates/finding-format.md`). If all three detectors return nothing, write one Level 3 observation: "Step <N> — no anomalies detected."

**Agent judgment:** After the detectors, assess the overall UI state. If something the flow requires is visibly absent or wrong and the detectors didn't catch it — log a Level 2 finding with what is missing and why it matters. Do not re-derive anything the detectors already reported.

### Mini-probe (Level 1 or Level 2 finding)

Before moving to the next checklist step:
- Budget: **2 extra minutes** or 2 targeted actions, whichever fires first.
- Try 1–2 variations: different data item, adjacent navigation path, or related action. **When the finding involves a shared UI component** (picker, KPI card, data view selector), visiting 1–2 adjacent pages that use the same component is the highest-value probe — it distinguishes page-specific from systemic issues.
- Log new findings immediately (same flow, same step label, suffix "— mini-probe").
- Do **not** claim a new flow's timebox. If the parent flow's timebox fires during a mini-probe, stop and log remaining steps as `skipped: time budget exhausted`.

### When uncertain about expected behavior

Consult in order — stop when you have enough to proceed:
1. **Specs** (`config.json → specs`) — if the user provided a PRD, acceptance criteria, or design doc, read it first. It is the authoritative source of truth for intended behavior.
2. **Official docs** (`config.json → specs_fallback`, default `https://www.elastic.co/docs/solutions/security`) — if no specs were provided, or the specs don't cover the specific behavior in question, consult the official documentation.
3. **UI** — labels, tooltips, help text, and onboarding copy visible in the browser.
4. **Test files** — Cypress (`.cy.ts`) or functional test files for intended user flows **only**. Never copy selectors, CSS classes, or `data-test-subj` values.
5. **Never source code** — React components, hooks, reducers, API handlers are off-limits. The implementation may itself be wrong.

**Specs vs fallback:** if both a spec and official docs exist, the spec wins for anything it covers explicitly. Use official docs for anything the spec is silent on.

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
