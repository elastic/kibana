---
name: bug-fixer
description: >
  Use when the user mentions a bug number or asks to fix, reproduce, investigate, or
  debug anything in Kibana Security Solution — even just "look into #NNN",
  "something's broken with X", or "can you fix this". Any GitHub issue number in a
  Security Solution context triggers this skill.
---

# Bug Fixer

**Scope:** Stateful (ECH) environments only. Decline serverless bugs before starting either step.

Fixing a Security Solution bug is a two-step process. These skills are not
auto-discovered — they must be invoked explicitly by path.

## How to invoke

**Claude Code and Cursor — ask the agent:**

Step 1 (reproduce):
> `/bug-reproduce #NUMBER`

Step 2 (fix) — after reviewing the reproduction report:
> `/bug-fix`

## What each step does

**Step 1 — bug-reproduce**
Fetches the ticket, starts the Scout server, reproduces the bug through the browser,
and writes `.bug-fixer-session/analysis.json` + `.bug-fixer-session/reproduction-report.md`. Ends by asking you to review
the findings before proceeding.

**Step 2 — bug-fix**
Reads the reproduction artifacts, presents a fix plan for your explicit approval,
implements a TDD fix, verifies in a clean environment, and optionally opens a draft PR.

## Quick Reference

| Step | Skill | Produces |
|------|-------|---------|
| 1 | bug-reproduce | `.bug-fixer-session/analysis.json`, `reproduction-report.md`, `before.png` |
| 2 | bug-fix | Fix + test + verified browser repro + optional draft PR with `after.png` |

**Scope:** Stateful (ECH) only — decline serverless bugs before starting either step.

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

Tell the user the two invocation commands above (`/bug-reproduce #NUMBER`, then `/bug-fix`). Do not read any other skill file. Do not start any work yourself.
