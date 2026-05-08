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

### Phase A: Reproduce

Read and follow `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-reproduce/SKILL.md` in full.

When complete, `bug-reproduce` will have written two files to the Kibana repo root:
- `analysis.json` — classification, affected paths, reproduction steps, server args
- `reproduction-report.md` — browser diagnostics, data path trace, user acknowledgement

### Handoff gate

Before proceeding to Phase B, verify:
1. `reproduction-report.md` exists
2. Its `status` field is `reproduced`
3. Its `user_acknowledged` field is `yes`

If any of these are false, return to Phase A. A fix without confirmed reproduction is a guess — do not proceed to Phase B until all three conditions are met.

`user_acknowledged` must only be `yes` if the user replied in the conversation after seeing
the reproduction report. If the agent wrote that field without a real user reply, treat it
as `pending` and return to Phase A.

### Phase B: Fix

Read and follow `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fix/SKILL.md` in full, with `analysis.json` and
`reproduction-report.md` available as context.
