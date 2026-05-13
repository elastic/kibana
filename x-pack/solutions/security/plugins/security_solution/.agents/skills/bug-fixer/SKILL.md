---
name: bug-fixer
description: >
  Use when the user mentions a bug number or asks to fix, reproduce, investigate, or
  debug anything in Kibana Security Solution — even just "look into #NNN",
  "something's broken with X", or "can you fix this". Any GitHub issue number in a
  Security Solution context triggers this skill.
  Stateful (ECH) only — decline serverless bugs before starting.
---

# Bug Fixer

Fixing a Security Solution bug is a two-step process. These skills are not
auto-discovered — they must be invoked explicitly by path.

## How to invoke

**Claude Code and Cursor — ask the agent:**

Step 1 (reproduce):
> "Read and follow `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-reproduce/SKILL.md` for issue #NUMBER"

Step 2 (fix) — after reviewing the reproduction report:
> "Read and follow `x-pack/solutions/security/plugins/security_solution/.agents/skills/bug-fix/SKILL.md`"

## What each step does

**Step 1 — bug-reproduce**
Fetches the ticket, starts the Scout server, reproduces the bug through the browser,
and writes `analysis.json` + `reproduction-report.md`. Ends by asking you to review
the findings before proceeding.

**Step 2 — bug-fix**
Reads the reproduction artifacts, presents a fix plan for your explicit approval,
implements a TDD fix, verifies in a clean environment, and optionally opens a draft PR.

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

## Agent instruction

Tell the user the two invocation commands above. Do not read any other skill file.
Do not start any work yourself.
