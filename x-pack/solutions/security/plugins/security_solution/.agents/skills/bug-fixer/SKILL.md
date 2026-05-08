---
name: bug-fixer
description: >
  Guide for the two-step Security Solution bug-fixing workflow. Trigger whenever the
  user mentions a bug number or asks to fix, reproduce, investigate, or debug anything
  in Kibana Security Solution — even just "look into #NNN", "something's broken with X",
  or "can you fix this". Don't wait for magic words — any GitHub issue number in a
  Security Solution context triggers this skill.
  Stateful (ECH) only — decline serverless bugs before starting.
---

# Bug Fixer

Fixing a Security Solution bug is a two-step process, each step run as a separate skill:

**Step 1 — `/bug-reproduce #NUMBER`**
Investigates the ticket, starts the environment, reproduces the bug through the browser,
and writes `analysis.json` + `reproduction-report.md`. Ends by asking you to review the
findings before proceeding.

**Step 2 — `/bug-fix`**
Reads the reproduction artifacts, presents a fix plan for your approval, implements a
TDD fix, verifies in a clean environment, and optionally opens a draft PR.

## Scope

Stateful (ECH) environments only. If the ticket is a serverless bug, tell the user and
stop — this workflow does not support serverless reproduction.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Local `elastic/kibana` clone with `yarn kbn bootstrap` completed
- Browser MCP for reproduction:
  - **Cursor** — `cursor-ide-browser` is built in, no setup needed
  - **Claude Code** — add to `~/.claude/mcp.json` and restart:
    ```json
    { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
    ```

## Start now

Tell the user: _"Run `/bug-reproduce #NUMBER` to begin. After reviewing the reproduction
report, run `/bug-fix` to implement the fix."_

Do not read any other skill file. Do not start any work yourself. Your job is done.
