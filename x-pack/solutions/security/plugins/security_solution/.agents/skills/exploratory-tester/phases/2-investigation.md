# Investigation flow (Level 1 finding only)

**Only read this file if you are running single mode, or you are the
orchestrator itself.** A parallel-mode sub-agent never opens an
investigation flow directly — see the Worker deny-list in
`phases/2-flow-core.md`. If you are a sub-agent and reached this file by
mistake, go back to `2-flow-core.md` and finish your assigned flow instead;
the orchestrator will read your findings file after Wave 1 and decide
whether to open one.

After the mini-probe in `phases/2-confirm-candidate.md`, if a **Level 1**
finding still has unresolved scope — for example, you don't know whether
the bug is isolated to this flow's path or is a cross-feature blocker —
open an investigation flow:

1. Finish the current flow (or log remaining steps as skipped if the timebox has fired).
2. Add a new entry to `config.json → flows` with:
   - `source: "investigation"`
   - `triggered_by: "<exact title of the Level 1 finding>"`
   - `entry:` pointing at the area most likely to reveal scope
   - `expected:` stating what you're trying to determine (e.g. "Does this 500 appear on all entity analytics sub-pages or only on the main dashboard?")
   - `timeout_minutes: 6` (default; adjust up if the scope question requires more steps)
3. Run the investigation flow immediately after the current flow completes, before moving to the next specified flow — using `phases/2-flow-core.md` exactly like any other flow.
4. Log findings in a new `findings-flow-<N>.md`. The report will group investigation flows with the Level 1 finding that triggered them.

**When NOT to open an investigation flow:** if the mini-probe already answered the scope question (e.g. confirmed the bug is page-specific), or if the finding is Level 2 — Level 2 findings get mini-probes, not investigation flows. Reserve investigation flows for confirmed bugs where scope determines whether the issue is a blocker.

**When you cannot open an investigation flow** (session cap fired, or the flow would clearly exceed the remaining budget): record it as a deferred flow instead. Append to `config.json → deferred_flows`:
```json
{
  "name": "<short description of what needs investigating>",
  "triggered_by": "<Level 1 finding title>",
  "entry": "<entry path>",
  "reason_not_run": "<session cap reached | would exceed budget | agent flow cap reached>",
  "priority": "<blocker | high | medium>"
}
```
Deferred flows appear in the report's **Recommended Follow-up** section so the user knows exactly what still needs attention and why it wasn't covered.
