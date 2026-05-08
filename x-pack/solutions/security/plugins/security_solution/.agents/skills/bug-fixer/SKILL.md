---
name: bug-fixer
description: >
  End-to-end Kibana Security Solution bug fixing: reproduction, TDD fix, and verified PR.
  Trigger whenever the user mentions a bug number or asks to fix, reproduce, investigate,
  or debug anything in Kibana Security Solution — even just "look into #NNN", "something's
  broken with X", or "can you fix this". Don't wait for magic words — any GitHub issue
  number in a Security Solution context triggers this skill.
  Stateful (ECH) only — decline serverless bugs before starting.
---

# Bug Fixer

Orchestrates the full bug-fixing workflow by sequencing two focused skills:
`bug-reproduce` (investigation + browser reproduction) and `bug-fix` (TDD fix + PR).

## Scope

This skill works for **stateful (ECH) environments only**. Serverless is not supported —
the local dev server started in Phase 1 runs in stateful mode, and serverless bugs require
a different environment setup that this skill does not handle. If the ticket is a serverless
bug, tell the user and stop.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Local `elastic/kibana` clone with `yarn kbn bootstrap` completed
- Browser MCP for reproduction:
  - **Cursor** — `cursor-ide-browser` is built in, no setup needed
  - **Claude Code** — add to `~/.claude/mcp.json` and restart:
    ```json
    { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
    ```

## Knowledge Base

Read `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fixer/KNOWLEDGE.md` before starting. Apply relevant learnings.

## Workflow

This skill runs in **two separate turns**. Read only the section that matches your
current turn. Executing both turns in a single response is a protocol violation.

---

### Turn 1 — Reproduce

Read and follow `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-reproduce/SKILL.md` in full.

When `bug-reproduce` presents the reproduction report, **your response ends**. Write a
one-line summary of what was found and tell the user: _"Reply to start the fix phase."_
Then stop — no more tool calls, no more text. Do not read Turn 2. Do not start Phase B.
The fact that you may already know the fix is irrelevant: your turn is over.

Turn 2 starts only when the user replies.

---

### Turn 2 — Fix (only after the user replies to the reproduction report)

**Handoff gate.** Before doing anything, verify all three:
1. `reproduction-report.md` exists at the Kibana repo root
2. Its `status` field is `reproduced`
3. Its `user_acknowledged` field is `yes`

If any are false, return to Turn 1. `user_acknowledged` must only be `yes` after a real
user reply in this conversation — never written pre-emptively.

If all three pass, read and follow `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fix/SKILL.md` in full, with `analysis.json` and `reproduction-report.md` available as context.
