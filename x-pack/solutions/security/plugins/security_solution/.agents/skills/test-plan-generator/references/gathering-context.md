# Gathering Context (Step 1)

This file defines exactly how to gather all context needed to generate a test plan. Follow every step in order.

---

## Contents

- [GitHub fetches](#github-fetches)
- [URL categorization](#url-categorization)
- [Images](#images)
- [Figma](#figma)
- [Google Docs](#google-docs)
- [Linked GitHub issues](#linked-github-issues)
- [Parent issue](#parent-issue)
- [Sub-issues](#sub-issues)
- [Pull requests and test coverage](#pull-requests-and-test-coverage)
- [Context window management](#context-window-management)

---

## GitHub fetches

**Use `gh` CLI for all GitHub fetches.** The GitHub MCP causes Cursor to freeze on large responses. Fall back to GitHub MCP only if `gh` is not installed or not authenticated — check with `gh auth status` before starting.

Fetch the full issue first:

```
gh issue view <number> --repo <owner>/<repo> --json number,title,body,labels,assignees,comments,projectItems
```

---

## URL categorization

Parse the issue body and categorize all URLs:

| Type | Pattern | Fetched in |
|---|---|---|
| Figma | `figma.com` | [Figma](#figma) below |
| Google Docs / Drive | `docs.google.com` or `drive.google.com` | [Google Docs](#google-docs) below |
| GitHub issues | `github.com/elastic` + `/issues/` | [Linked GitHub issues](#linked-github-issues) below |
| GitHub PRs | `github.com/elastic` + `/pull/` | [Pull requests](#pull-requests-and-test-coverage) below |
| Other | anything else | Note in Known Limitations if relevant |

---

## Images

For each **image URL** in the issue body, comments, or any PR body or PR review comment: fetch and analyze. Do not skip — they frequently contain UI mockups, annotated screenshots, or acceptance criteria not described in text. Extract: UI layout, component names, states, labels, button names, error messages, and annotations. Use all of this when writing scenarios.

---

## Figma

For each **Figma link**: use the Figma MCP. If a `node-id` parameter is present, fetch that specific node — do not just fetch the file root. Extract: component names and states, navigation flows, empty states, error states, loading states, and any interactions or annotations visible in the design.

| Figma role | Action |
|---|---|
| Primary UX source for this feature | Ask the user before continuing |
| Supplementary / supporting link | Flag in Known Limitations with ⚠️ and continue |

---

## Google Docs

For each **Google Docs link**: use the Google Drive MCP if configured. If not available, note in Known Limitations with a `⚠️` flag and continue — do not block.

---

## Linked GitHub issues

For each **GitHub issue link** (not PRs — those are handled below): fetch using `gh issue view <number> --repo <owner>/<repo> --json number,title,body,comments`. Fall back to GitHub MCP if unavailable.

---

## Parent issue

Required — skip only if the issue has no parent.

Check the "Relationships" or "Parent issue" section in the sidebar. If a parent exists:

1. Fetch using `gh issue view <number> --repo <owner>/<repo> --json number,title,body,labels,comments`. Fall back to GitHub MCP if unavailable.
2. For each **image URL** found: fetch and analyze.
3. For each **Figma link** found: use the Figma MCP. Parent epics often contain the most complete designs — treat as high-value context.
4. Check comments for an existing test plan (body starts with `<!-- test-plan-generated -->`). If found, store as **parent test plan** — use it in Step 2 to understand what is already covered at the epic level.

Constraints:
- Navigate one level up only. If the parent also has a parent, stop there.
- Do not read the parent's sub-issues (siblings of the current issue).
- Use parent content as **background context only** — it informs the "why" and overall design direction. Do not write scenarios based on parent content alone; use it only to enrich scenarios already justified by the current issue.

---

## Sub-issues

Required — do not skip.

Fetch **every** sub-issue found in the "Sub-issues" section or metadata — without exception (subject to the context window management rules below):

```
gh issue view <number> --repo <owner>/<repo> --json number,title,body,comments
```

Fall back to GitHub MCP if unavailable. For each sub-issue: read the full title, body, all comments, all images, and all URLs. Apply the same context-gathering process recursively. Treat sub-issue content as first-class context — as important as the main issue.

For each sub-issue, extract every acceptance criterion — both explicit bullet points and implied requirements — and add them to a **flat acceptance criteria list** keyed by sub-issue number. This list is a critical artifact: it will be used in Step 2 to build the consolidated checklist and in Step 3's self-review to verify complete coverage.

For each sub-issue, check its comments for an existing test plan (body starts with `<!-- test-plan-generated -->`). If found, store as **sub-issue test plan for #<number>**. Collect all of them — they will be used in Step 2 to avoid duplication.

Do not proceed to the pull requests section until all sub-issues have been fully read.

---

## Pull requests and test coverage

Required — do not skip. PRs are the ground truth of what was actually built. Issue descriptions may be outdated.

Find all PRs linked to the issue. Look in:
- The "Development" section on the right sidebar
- The issue body (PR URLs mentioned inline)
- The issue comments (PRs referenced with `#number` or full URLs)
- Any sub-issue already read — apply this same step to each

For each PR found, fetch the description, review comments, and diff:

```
gh pr view <number> --repo <owner>/<repo> --json number,title,body,comments,files
gh pr diff <number> --repo <owner>/<repo>
```

Fall back to GitHub MCP if unavailable. Apply these limits to the diff:

| Rule | Detail |
|---|---|
| Max files | 20 per PR |
| Priority order | Test files → UI components → feature flags / permissions → feature-related files |
| Skip if | File diff > 500 lines (note filename was skipped) |
| Always skip | Binary files, generated files (`*.snap`, `*.lock`, `*.min.js`, `*.gen.ts`, `*.gen.tsx`), translation files (`i18n`, `*.json`) |

**Build the test coverage catalog.** For each test file found, extract: the test type (unit `*.test.ts`, integration, API integration, or e2e Cypress `*.cy.ts` / Scout), the file path, and the describe blocks and test names. Store this catalog — it will be used in Step 3 to populate automation coverage lines.

**Build a PR artifacts inventory.** While reading each PR's file list and diff, identify every new or substantially modified: API route, service method, UI component/page, saved object type, schema definition, and feature flag. Each distinct artifact is a candidate for at least one test scenario. Store this inventory — it will be used in Step 3's self-review to verify no implemented artifact is left without a corresponding scenario.

**If a PR has no test files**, search the filesystem for existing tests:
- Look for `*.test.ts` / `*.spec.ts` files adjacent to the modified source files
- Look in `__tests__/` folders near the modified files
- Use [`references/security-test-directories.md`](references/security-test-directories.md) to find canonical test directories for the feature area
- Search for folders named `cypress`, `e2e`, or `scout` anywhere under `x-pack/solutions/security/`
- Search for folders named `integration`, `api_integration` anywhere under `x-pack/` that relate to the feature name or modified file names

If no tests are found after all of the above, record `No existing tests found` in the catalog for this PR and continue — do not block. If a PR was already read in a previous session and a draft file exists, do not re-read it unless the user explicitly asks.

Do not proceed to Step 2 until all linked PRs and their sub-issue PRs have been read, within the limits above.

---

## Context window management

Apply when the issue has more than 5 sub-issues or more than 3 linked PRs.

| Priority | Source | Read order |
|---|---|---|
| 1 | Main issue body and images | Always read in full |
| 2 | Sub-issues | Most recently updated first; stop if context pressure detected |
| 3 | PRs | Most recently merged first; stop if context pressure detected |

If stopped early, continue to Step 2 with what you have and list every skipped source in the Sources Summary with `⚠️ Skipped — context limit reached`.
