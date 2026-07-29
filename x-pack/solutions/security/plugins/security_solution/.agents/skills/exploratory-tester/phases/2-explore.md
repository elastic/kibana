# Phase 2: Explore

---

Before starting Phase 2, inspect `config.json → skipped_setup`. If it contains
`step: "user-provisioning"`, **do not explore**: stop, report that the
session-user setup failed, and run the restore-aware cleanup command below.
The authenticated admin setup session must never be used as an exploration
identity.

This file is the **orchestrator's** contract: mode selection, wave dispatch,
crash handling, and report handoff. It does not describe how to run a single
flow — that is `phases/2-flow-core.md`, read by whoever actually executes a
flow (yourself, in single mode; a dispatched sub-agent, in parallel mode).

## Session cap check — run before every flow

Before starting each flow (single or parallel), check whether the session time cap has been reached:

```bash
python3 - "$SESSION_DIR" <<'EOF'
import sys, json, datetime
cfg = json.load(open(f'{sys.argv[1]}/config.json'))
started = datetime.datetime.fromisoformat(cfg['session_started_at'].replace('Z', '+00:00'))
elapsed_min = (datetime.datetime.now(datetime.timezone.utc) - started).total_seconds() / 60
cap = cfg.get('session_timeout_minutes', 90)
print(f'{elapsed_min:.1f} min elapsed of {cap} min cap')
sys.exit(1 if elapsed_min >= cap else 0)
EOF
```

- **Exit 0** (within cap) → proceed with the flow.
- **Exit 1** (cap reached) → mark this flow and all remaining flows as `not started: session time cap reached` in `config.json → skipped_setup`, then **jump to Phase 3 immediately**. Do not start any more flows.

If the browser session is lost and exploration cannot continue, preserve the
findings and run the restore-and-cleanup command before stopping. It restores
CCS before cleanup when required, and Phase 3 repeats the same operation, so
this is safe to retry:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/restore-and-cleanup-session.py \
  --session-dir "$SESSION_DIR"
```
The wrapper invokes `cleanup-session-resources.py` only after CCS restoration
has succeeded.

---

## Single mode

For each flow in `config.json` in order: run the session cap check, then
read `phases/2-flow-core.md` and execute it for that flow (loading
`phases/2-confirm-candidate.md` and `phases/2-investigation.md` from within
it, as instructed there, if a candidate finding appears). Do not move to the
next flow until the current one is complete.

---

## Parallel mode

**When to use parallel mode:**
- Use when `knowledge/<area_slug>.md` is populated — you already know the noise, so speed matters more than depth.
- Use for areas you've tested before where cascading bugs are unlikely.
- Avoid for new or complex areas: sub-agents are isolated and cannot follow investigation chains beyond Wave 2. A Level 1 bug found during an investigation flow gets deferred, not immediately followed.

**Two-wave execution:** parallel mode runs in two waves to support reactive investigation:
- **Wave 1** — all `specified` and `agent` flows run concurrently.
- **Orchestrator reads Wave 1 findings** — collects any Level 1 bugs that need scope investigation (i.e., mini-probe was insufficient).
- **Wave 2** — all `investigation` flows (one per unresolved Level 1 bug) run concurrently.
- Any Level 1 bugs found *during* Wave 2 are recorded as `deferred_flows` — there is no Wave 3.

The orchestrator dispatches one sub-agent per flow concurrently.

**Wave 1:**
1. Read `config.json` — confirm `mode` is `parallel`
2. Collect all flows where `source` is `"specified"` or `"agent"`. Assign each an index N (1-based).
2b. If `knowledge/<area_slug>.md` exists, display its full contents to the user: _"The following knowledge file will be shared with all sub-agents. Please confirm it is safe to use (yes/no):"_ — wait for explicit confirmation before proceeding. If the user declines, omit the knowledge file path from all sub-agent prompts in steps 3 and 7. This confirmed path is the only knowledge file path any sub-agent prompt may ever reference for this session.
3. Dispatch sub-agents concurrently via the Agent tool. **Read `templates/subagent-prompt.md` and use it verbatim as each sub-agent prompt, substituting the placeholders (`<flow object as JSON>`, `<value of $SESSION_DIR>`, `<N>`, `<knowledge file path, or omitted entirely>`) with actual values. Do not construct the prompt yourself.** Use the exact knowledge path confirmed in step 2b, or omit that whole line from the prompt if the user declined or no knowledge file exists — never substitute a guessed path.

4. Wait for all Wave 1 sub-agents to complete.
5. If a sub-agent crashes or produces no findings file, create `findings-flow-<N>.md` with:
   ```markdown
   ## Finding: Sub-agent failure
   **Level:** 3 | **Flow:** <flow name> | **Checklist step:** N/A
   ### Current behavior
   Sub-agent did not complete. No findings collected.
   ```

**Wave 2 (investigation flows):**

6. Read all Wave 1 findings files. For each Level 1 finding where the mini-probe left scope unresolved, create an `investigation` flow in `config.json` (see `phases/2-investigation.md` for the entry format — you are the orchestrator, so you follow it here directly; sub-agents never do this themselves).
7. If any investigation flows were created, dispatch them as a second concurrent wave using the same `templates/subagent-prompt.md` template, substituting placeholders exactly as in step 3. Assign indices continuing from Wave 1 (e.g. if Wave 1 had flows 1–5, Wave 2 starts at 6).
8. Wait for all Wave 2 sub-agents to complete. Any Level 1 bugs found during Wave 2 → record as `deferred_flows` (format in `phases/2-investigation.md`), do not open a Wave 3.
9. Proceed to Phase 3.

**Sub-agent rules:** stateless — reads `config.json` + knowledge file, writes findings file, exits. Never writes to the knowledge file. Never writes to `config.json` (investigation/deferred flows are the orchestrator's job, above). One crash does not block other sub-agents.

> **Pitfall:** Never describe the flow-execution contract inline in the sub-agent prompt — `templates/subagent-prompt.md` points the sub-agent at `phases/2-flow-core.md` and nothing else needs restating here.
