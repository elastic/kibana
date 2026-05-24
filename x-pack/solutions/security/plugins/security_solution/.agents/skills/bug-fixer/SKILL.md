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

Fixing a Security Solution bug is a two-step process. The slash commands below require
symlink setup — see Prerequisites.

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

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Local `elastic/kibana` clone with `yarn kbn bootstrap` completed
- Browser MCP for reproduction:
  - **Cursor** — `cursor-ide-browser` is built in, no setup needed
  - **Claude Code** — add to `~/.claude/mcp.json` and restart:
    ```json
    { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
    ```
- Skill symlinks (run from repo root, then restart your IDE):
  - **Claude Code**:
    ```bash
    SKILL_ROOT="$(pwd)/x-pack/solutions/security/plugins/security_solution/.agents/skills"
    ln -s "$SKILL_ROOT/bug-fixer"    ~/.claude/skills/bug-fixer
    ln -s "$SKILL_ROOT/bug-reproduce" ~/.claude/skills/bug-reproduce
    ln -s "$SKILL_ROOT/bug-fix"      ~/.claude/skills/bug-fix
    ```
  - **Cursor** — symlink into `.agents/skills/` at the repo root:
    ```bash
    SKILL_ROOT="x-pack/solutions/security/plugins/security_solution/.agents/skills"
    ln -s "$SKILL_ROOT/bug-fixer"    .agents/skills/bug-fixer
    ln -s "$SKILL_ROOT/bug-reproduce" .agents/skills/bug-reproduce
    ln -s "$SKILL_ROOT/bug-fix"      .agents/skills/bug-fix
    ```

## Agent instruction

Tell the user the two invocation commands above (`/bug-reproduce #NUMBER`, then `/bug-fix`). Do not read any other skill file. Do not start any work yourself.
