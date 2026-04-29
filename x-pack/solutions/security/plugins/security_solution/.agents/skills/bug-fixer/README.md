# Bug Fixer Skill

End-to-end Kibana Security Solution bug reproduction, TDD fixing, and verification. Drives the full workflow from GitHub issue to draft PR — classify, start environment, reproduce in browser, root cause analysis, write failing test, implement fix, verify, open PR.

## Setup

### 1. GitHub CLI

Required for fetching issues and opening PRs.

```bash
# macOS
brew install gh

# Authenticate
gh auth login
```

Verify with `gh auth status`.

### 2. Browser MCP

Required for browser reproduction (Phase 3). Setup depends on your editor:

**Cursor** — `cursor-ide-browser` is built in. No setup needed.

**Claude Code** — add `@playwright/mcp` to your MCP config (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Then restart Claude Code.

### 3. Local Kibana clone

```bash
git clone https://github.com/elastic/kibana.git
cd kibana
yarn kbn bootstrap
```

## Ticket requirements

The skill works best when the GitHub issue is well-structured. Before asking the skill to fix a bug, check that the ticket includes:

- **Steps to reproduce** — exact navigation path and user actions (not just "go to X")
- **Current behavior** — what actually happens (error messages, empty states, wrong values)
- **Expected behavior** — what should happen instead
- **Feature flags** — if the bug only reproduces with a feature flag enabled, it must be listed explicitly (e.g., `xpack.securitySolution.enableExperimental: ["myFlag"]`). The skill cannot guess which flags are needed.

If any of these are missing, update the ticket before triggering the skill — the skill will flag the gap, but a well-written ticket produces a much more accurate fix.

## Usage

From your Kibana repo, ask the agent:

```
fix bug #12345
reproduce bug #12345
investigate issue #12345
```
