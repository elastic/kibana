# AI-Powered Test Plan Generator — Cursor Setup Guide

This guide walks you through setting up an AI agent in Cursor that automatically generates comprehensive test plans from GitHub issues. The agent reads the issue description, navigates the parent epic and all sub-issues, fetches linked Figma designs and images, and posts the test plan as a comment directly on the issue.

---

## How It Works

1. A GitHub issue is labeled **`needs Test Plan`** — this is a team convention to identify which issues need a test plan. The agent works on any issue regardless of labels.
2. You open Cursor and type: `/test-plan-generator generate test plan for issue #1234`
3. The agent reads the issue, navigates the parent epic (if any), explores all sub-issues, fetches linked Figma designs and images, and generates a structured test plan
4. The test plan is saved locally as a draft at `.cursor/tmp/test-plan-#<issue_number>.md` for you to review and edit
5. When you're happy with it, you run: `/test-plan-generator publish test plan for issue #1234`
6. The agent posts the plan as a comment on the GitHub issue — using the GitHub MCP if available, or the `gh` CLI as fallback
7. If the issue changes later, run `/test-plan-generator update test plan for issue #1234` — the agent detects only what changed and updates the draft incrementally, without rewriting everything from scratch

---

## Prerequisites

Before starting, make sure you have:

- [ ] [Cursor](https://cursor.com) installed and signed in with your `@elastic.co` Google account
- [ ] Access to [github.com/elastic](https://github.com/elastic)
- [ ] A Figma account with access to Elastic's Figma workspace
- [ ] Node.js 18+ installed (`node --version` to check)

---

## Step 1 — Generate Your GitHub Personal Access Token

The agent needs a token to read and comment on GitHub issues via the GitHub MCP server.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a descriptive name, e.g., `cursor-test-plan-agent`
4. Set expiration to **90 days** (or "No expiration" if your org allows it)
5. Select the `repo` scope (full control of private repositories)
6. Click **Generate token** and **copy it immediately** — you won't see it again

> ⚠️ Keep this token private. Never commit it to a repository.

### Authorize the token for the Elastic organization (required)

This step is critical. Without it, all GitHub API calls to `elastic` repositories will fail with a `403 SAML enforcement` error.

1. On the [tokens page](https://github.com/settings/tokens), find your newly created token
2. Click **"Configure SSO"** next to it
3. Click **"Authorize"** next to the `elastic` organization
4. Complete any SSO prompts that appear

---

## Step 2 — Generate Your Figma Personal Access Token

1. Open [figma.com](https://figma.com) and log in with your `@elastic.co` account
2. Click your profile avatar (top-left) → **Settings**
3. Scroll down to **"Personal access tokens"**
4. Click **"Generate new token"**, give it a name like `cursor-mcp`, and click **Generate**
5. **Copy the token** — it will only be shown once

---

## Step 3 — Configure the GitHub and Figma MCP Servers in Cursor

Cursor reads MCP configuration from a file called `mcp.json`. The GitHub MCP is the primary way the agent reads issues and posts comments. The Figma MCP allows the agent to fetch design context from linked Figma files.

### Locate or create the file

- **macOS / Linux:** `~/.cursor/mcp.json`
- **Windows:** `%APPDATA%\Cursor\mcp.json`

Open the file (create it if it doesn't exist) and paste the following, replacing the placeholder values with your actual tokens:
```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer YOUR_GITHUB_TOKEN_HERE"
      }
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key=YOUR_FIGMA_TOKEN_HERE", "--stdio"]
    }
  }
}
```

> **Why this approach?**
>
> - **GitHub** uses a remote HTTP server hosted by GitHub — no local installation needed, and it provides the most complete set of tools (~41 actions including reading issues, posting comments, navigating sub-issues, etc.). The older `@modelcontextprotocol/server-github` npm package was deprecated in April 2025.
>
> - **Figma** uses the `figma-developer-mcp` package, which is the officially recommended package for Cursor (optimised for code generation from designs). The token is passed as a CLI argument — not as an environment variable — because that is how this package expects it. The older `@figma/mcp-server` package does not exist, and `@modelcontextprotocol/server-figma` has been deprecated.

### Save the file and restart Cursor

After saving, fully quit and reopen Cursor. The MCP servers start automatically on launch.

### Verify the MCPs are connected

1. Open Cursor Settings → **MCP** tab
2. You should see `github` and `figma` listed with a green status indicator
3. Hover over the `github` entry — you should see ~41 available tools listed
4. Hover over the `figma` entry — you should see 2 available tools listed

> If a server shows as disconnected, double-check the token values and that the JSON has no syntax errors. Use [jsonlint.com](https://jsonlint.com) to validate if needed.

---

## Step 4 — Install the `gh` CLI (recommended)

The `gh` CLI is GitHub's official command-line tool. The agent uses it as a fallback to post comments when the GitHub MCP tools are not available in the session. **Having both the GitHub MCP and `gh` installed ensures the agent can always publish test plans**, even if one of them fails.

### Install
```bash
brew install gh
```

### Authenticate with SSO

Elastic does not allow HTTPS authentication. When running `gh auth login`, select **Login with a web browser** (not HTTPS):
```bash
gh auth login
```

When prompted:
1. Select **GitHub.com**
2. Select **Login with a web browser**
3. Copy the one-time code shown in the terminal
4. Press Enter — your browser will open automatically
5. Paste the code and authorize the app
6. Return to the terminal — authentication completes automatically

### Verify
```bash
gh auth status
```

You should see your username and a valid token with `repo` scope.

---

## Step 5 — Google Drive (optional, deferred)

Google Drive integration requires a Google Cloud OAuth setup that goes beyond a simple token. It is **not required for the pilot** — GitHub and Figma are sufficient to generate high-quality test plans.

To enable it in the future (e.g., when migrating to a GitHub Actions workflow with a company service account), follow the [official MCP Google Drive setup guide](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive).

---

## Step 6 — Check Out the Skill

The skill and its reference files were added to the repository by the Engineering Productivity team. Once you have the repo checked out locally and open in Cursor, the skill is automatically available — no manual file creation needed.

The files live at:
```
x-pack/solutions/security/.agent/skills/test-plan-generator/
├── SKILL.md                          # Agent instructions
└── references/
    ├── optional-scenarios.md         # Gherkin templates and formatting rules
    └── output-formats.md             # Sources Summary template and chat output formats
```

> **Why a skill and not a Cursor rule?** Skills are the current standard for extending AI agents in Kibana, agreed by Kibana tech leads and the AI guild. They are more efficient than rules (loaded on demand, not on every agent session), portable across agents, and version-controlled like any other code.

### How to invoke it

Since the skill uses `disable-model-invocation: true`, it is **not** applied automatically. You must invoke it explicitly by typing `/test-plan-generator` in the Agent chat, followed by your command:
```
/test-plan-generator generate test plan for issue #1234
```
```
/test-plan-generator update test plan for issue #1234
```
```
/test-plan-generator publish test plan for issue #1234
```

---

## Step 7 — Verify the Setup

1. Open Cursor in your repository
2. Open the **Agent** panel and make sure it is in **Agent** mode (not Ask or Edit)
3. Select **`auto`** as the model — this avoids rate-limiting issues that can cause Cursor to hang on complex issues with many sub-issues and PRs
4. Type:
```
   /test-plan-generator generate test plan for issue #1234
```
   Replace `1234` with a real issue number that has a description, acceptance criteria, and ideally some sub-issues.
5. Watch the agent work through the steps — it will show what it reads from GitHub, Figma, and any linked content
6. When finished, open `.cursor/tmp/test-plan-#1234.md` in the editor to review the draft
7. When happy with it, run: `/test-plan-generator publish test plan for issue #1234`
8. Check the GitHub issue — the test plan should appear as a new comment posted with your account

---

## Daily Usage

Once set up, generating a test plan is as simple as:
```
/test-plan-generator generate test plan for issue #1234
```

Or with a full URL:
```
/test-plan-generator create a test plan for https://github.com/elastic/kibana/issues/1234
```

### Updating an existing test plan

If the issue changes and you need to update the plan:
```
/test-plan-generator update test plan for issue #1234
```

The agent fetches the published comment as the current state, re-reads the issue to detect what changed, applies only the differences, and saves the result as a new draft for you to review before publishing.

If you also need to refresh PR context (e.g., new commits were pushed):
```
/test-plan-generator update test plan for issue #1234 including PRs
```

### Publishing a reviewed draft
```
/test-plan-generator publish test plan for issue #1234
```

The agent will use the GitHub MCP if available. If not, it will automatically fall back to the `gh` CLI. Either way, the result is the same: the comment is posted (or updated) on the issue and the local draft is deleted.

---

## Troubleshooting

### "403 SAML enforcement" error when reading issues

Your GitHub token is not authorized for the Elastic organization. Go to [github.com/settings/tokens](https://github.com/settings/tokens), find your token, click **"Configure SSO"**, and authorize it for the `elastic` org. See Step 1 for the full procedure.

### GitHub MCP shows as disconnected in Cursor

Check that the `mcp.json` entry for `github` uses `"type": "http"` and the URL `https://api.githubcopilot.com/mcp/`. Ensure your GitHub token is correctly placed in the `Authorization` header value (after `Bearer `). Fully quit and reopen Cursor after any changes to `mcp.json`.

### Figma MCP not connecting or "package not found"

Make sure you are using `figma-developer-mcp` as the package name — not `@figma/mcp-server` or `@modelcontextprotocol/server-figma` (both are incorrect or deprecated). The token must be passed as a CLI argument in the `args` array (e.g., `--figma-api-key=YOUR_TOKEN`), not as an environment variable. See Step 3 for the exact configuration.

### "Cannot read Figma file"

Make sure the Figma file is shared with your `@elastic.co` account. The token can only access files your account can view.

### The agent says it cannot connect to GitHub and falls back to `gh` CLI

This is expected behaviour — it means the GitHub MCP tools were not exposed to the agent in this particular session. The agent will automatically use `gh` to publish the comment. As long as `gh auth status` shows a valid session, everything will work normally. If `gh` is not installed or not authenticated, see Step 4.

### `gh auth status` fails or shows no valid token

Run `gh auth login` again. When prompted for the authentication method, select **Login with a web browser** — do not select HTTPS, as Elastic does not allow it. See Step 4 for the full procedure.

### `gh auth login` — authentication fails or HTTPS is rejected

Make sure you select **Login with a web browser** when prompted, not the HTTPS option. Elastic enforces SSO and does not allow HTTPS-based authentication for the `elastic` GitHub organization.

### `gh` CLI posts the comment but the update flow is broken on the next run

The agent looks for a comment whose first line is exactly `<!-- test-plan-generated -->` to detect existing test plans and avoid duplicates. If that marker is missing or not on the first line, the agent will create a new comment instead of updating the existing one. Open the published comment on GitHub, make sure `<!-- test-plan-generated -->` is the very first line, save, and the update flow will work correctly from then on.

### The agent created a file instead of posting a comment

The agent did not follow the skill correctly. Check that the skill files exist at `x-pack/solutions/security/.agent/skills/test-plan-generator/` and that Cursor has loaded them (visible in Cursor Settings → Rules, Skills, Subagents under "Skills"). Try explicitly invoking with `/test-plan-generator` before your command.

### The agent skipped sub-issues

The skill explicitly states sub-issue navigation is mandatory. If it is still skipped, add to your prompt: "before generating the test plan, read all sub-issues of this issue in full." Also verify the GitHub MCP shows ~41 tools in Cursor Settings → MCP.

### The agent generates scenarios for things not in the issue

Add to your prompt: "only include scenarios for functionality explicitly described in the issue and its linked documents. Do not infer or assume features that are not mentioned."

### Cursor hangs or stops responding during generation

This happens when the issue has many sub-issues and PRs with large diffs, or when `update` is run in a new chat session without prior context — the agent may attempt to re-read everything from scratch.

**For `update` mode:** avoid adding "including PRs" to the command unless necessary. The default update mode re-reads the issue body, sub-issues, and comments to detect changes — but skips PRs, which are the heaviest part. If you need to refresh PR context, do it as a separate step: `/test-plan-generator update test plan for issue #1234 including PRs`.

**For `generate` mode:** if it hangs, split the work into two commands. First: `/test-plan-generator generate test plan for issue #1234, only read the issue and sub-issues, skip PRs`. Once that finishes: `/test-plan-generator update test plan for issue #1234 including PRs`.

After a hang, close and reopen Cursor. The draft is not lost if it was saved before the hang.

### JSON syntax error in mcp.json

Use [jsonlint.com](https://jsonlint.com) to validate the file. A missing closing brace `}` or an extra comma are the most common causes.

---

## FAQ

**Can I use this for any repository in the elastic org?**
Yes, as long as your GitHub token has access to that repository and has been SSO-authorized for the `elastic` org.

**What if the issue has no Figma or Google Docs links?**
The agent skips those steps and works only with the issue text and sub-issues. The quality of the test plan depends on the quality of the issue description.

**Can the agent read screenshots and images in issues?**
Yes, as long as you are using a vision-capable model in Cursor. Use the **`auto`** model setting — it selects the best available model for each step and avoids rate-limiting issues. The agent fetches and analyzes image URLs found in the issue body and comments — typically screenshots at `user-images.githubusercontent.com`. If an image requires authentication, the agent will note it could not be read.

**What if the issue has a parent epic?**
The agent automatically reads the parent issue one level up — including its body, images, and Figma designs — and uses it as background context. If the parent already has a published test plan, the agent reads it too and uses it to avoid duplicating scenarios. It does not read the siblings (other sub-issues of the same parent) and does not navigate further up the hierarchy.

**What if a sub-issue already has a published test plan?**
The agent reads it and uses it to understand what is already covered. It will not duplicate those scenarios in the current issue's test plan. If everything is already covered by sub-issue test plans, the agent will stop and ask how you want to proceed — offering a summary plan with links, a full self-contained plan, or cancellation.

**What if the issue itself already has a published test plan and I run `generate`?**
The agent will detect the existing test plan and ask whether you want to check if it is still up to date, generate from scratch, or cancel. If you choose to check, it will re-read all sources and add only what is missing — it will not rewrite what is already correct.

**Do I need both the GitHub MCP and `gh` CLI?**
No, but it is strongly recommended. The GitHub MCP is the primary method and provides the richest context for reading issues and navigating sub-issues. The `gh` CLI is the fallback for publishing when the MCP tools are not available in the agent session. Having both means the workflow is never blocked by a connectivity issue with either tool.

**Who maintains the skill?**
The skill files live in the repository under `x-pack/solutions/security/.agent/skills/test-plan-generator/`. Any team member can propose changes via PR, just like any other code file.

**Can I run this without being inside the repository folder in Cursor?**
No — the skill only loads when you have the repository open in Cursor. The MCP servers work globally, but the skill is repo-specific.

**Why is Google Drive not included in the pilot?**
It requires a Google Cloud OAuth application setup with credentials stored locally, which adds significant complexity for individual developers. When migrating to a GitHub Actions workflow, a company-provided service account can handle it without any local setup.

---

*Guide maintained by the Engineering Productivity team. For questions or improvements, open an issue or reach out on Slack.*