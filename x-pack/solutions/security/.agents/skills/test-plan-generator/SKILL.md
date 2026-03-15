---
name: test-plan-generator
description: Generate, update, and publish comprehensive test plans for GitHub issues. Use this skill when the user asks to generate, create, write, update, or publish a test plan for a GitHub issue.
disable-model-invocation: true
---

# Test Plan Generator

This skill generates comprehensive test plans from GitHub issues and posts them as comments. It navigates the full issue context: parent epics, sub-issues, linked PRs, Figma designs, and images.

## Core rule — never assume, always ask

**This rule applies at every step and overrides the desire to produce output quickly.**

If at any point something is ambiguous, missing, or unclear — stop and ask the user before continuing. Do not fill gaps with invented context or guesses. Do not proceed past the point of uncertainty.

When asking, be specific: quote the ambiguous text or describe exactly what is missing, and offer the most likely interpretation as a suggestion so the user can confirm or correct it.

If the user is not available and the information cannot be found in any source, leave a visible `⚠️` flag in the relevant section noting what needs to be confirmed — never publish an assumption as a fact.

---

## Execution constraints — read before doing anything else

**Sequential only — no parallel calls.** Execute every MCP tool call one at a time. Wait for each call to complete before making the next one. This applies throughout the entire skill — GitHub, Figma, Google Drive, filesystem reads, everything. Do not batch or parallelize any calls for efficiency.

**Read reference files only when explicitly instructed.** Each reference file is read at the exact point in the workflow where it is needed — never speculatively at the start of a session. The instructions in each mode and step tell you precisely when to read each file.

---

## Modes of operation

Detect the mode from the user's phrasing and check for an existing published comment (body starts with `<!-- test-plan-generated -->`) before doing anything else.

**Use `gh` CLI for this check** — do not use the GitHub MCP:
```
gh issue view <number> --repo <owner>/<repo> --json comments
```
Scan the returned comments for one whose body starts with `<!-- test-plan-generated -->`. Fall back to GitHub MCP only if `gh` is unavailable.

| User phrase | Existing plan? | Action |
|---|---|---|
| `generate / create / write` | No | Run Steps 1–3, save draft |
| `generate / create / write` | Yes | Ask A/B/C (see below) |
| `update / regenerate` | Yes | Incremental diff (see below) |
| `update / regenerate` | No | Full draft fallback — run Steps 1–3 |
| `publish / post` | n/a | Read local file, post to GitHub (Step 4) |

**generate / create / write — existing plan found (Ask A/B/C)**

Stop and tell the user:

> "A test plan already exists for issue #<number>. Would you like me to check if it is still up to date?
>
> **A) Check and update if needed** — I will re-read the issue, sub-issues, and any new PRs, compare them against the published test plan, and add only the scenarios or sections that are missing or outdated. I will not rewrite what is already correct.
>
> **B) Generate from scratch** — I will ignore the existing test plan and generate a new one. The existing comment will be overwritten when you publish.
>
> **C) Cancel** — do nothing."

If the user selects **A**, proceed as follows:
1. Read the published test plan in full — this is the baseline.
2. Run Steps 1 and 2 normally to gather and analyze all current context, including any PRs linked since the test plan was published.
3. Compare the gathered context against the baseline: identify acceptance criteria, scenarios, or sections that are missing or outdated.
4. If gaps are found: add only the missing scenarios and update only the outdated sections. Do not rewrite sections that are still accurate. If new scenarios need to be written, first read both reference files sequentially, one at a time:
   - `references/optional-scenarios.md` — Gherkin rules, tags, priority levels, and optional section templates
   - `references/output-formats.md` — scenario structure and automation coverage format

   When all new scenarios are written, run the Gherkin self-review from `references/output-formats.md`. Then review [`references/common-mistakes.md`](references/common-mistakes.md) and fix any issues found. Save the result to `.agents/tmp/test-plan-#<issue_number>.md` and tell the user exactly what was added or changed.
5. After saving the draft, output the Sources Summary as defined in `references/output-formats.md`.
6. If no gaps are found: tell the user "The existing test plan appears to be up to date. No changes are needed." Do not save a draft file.

If the user selects **B**, proceed normally through Steps 1, 2, and 3.

**update / regenerate — incremental diff**

If no published comment is found (body starting with `<!-- test-plan-generated -->`), skip the steps below and run Steps 1–3 as a full draft fallback — this is already covered by the modes table above.

1. Fetch the published comment on the issue that starts with `<!-- test-plan-generated -->`. This is the current state of the test plan — use it as the base. Store the comment's `updatedAt` timestamp as `PLAN_PUBLISHED_AT` — you will use it in step 3 to detect PR changes.
   ```
   gh issue view <number> --repo <owner>/<repo> --json comments
   ```
   From the returned comments array, find the one whose body starts with `<!-- test-plan-generated -->` and store its `updatedAt` field.

2. Re-fetch the issue body, all sub-issues, and any comments to detect what has changed since the comment was published.

3. **Check PR activity since the test plan was published.** Extract all PR numbers linked to the issue. Look in:
   - The issue body and comments (just re-fetched in step 2)
   - The published test plan (Known Limitations and automation coverage lines often reference PR numbers)

   For each linked PR, fetch only its update timestamp — this is a lightweight call that does not download the diff:
   ```
   gh pr view <number> --repo <owner>/<repo> --json number,title,updatedAt
   ```
   Compare each PR's `updatedAt` against `PLAN_PUBLISHED_AT`. Build two lists:
   - **PRs to re-read**: PRs whose `updatedAt` is more recent than `PLAN_PUBLISHED_AT` — these have had activity (new commits, reviews, or merges) since the test plan was published
   - **PRs unchanged**: PRs whose `updatedAt` is equal to or older than `PLAN_PUBLISHED_AT`

4. **Re-read PRs that have been updated.** For each PR in the re-read list, fetch the full content — description, review comments, and diff — applying the same limits as draft mode (max 20 files per PR, skip files over 500 lines, skip generated/binary/translation files). Update the test coverage catalog with any new or changed test files found.

   If a re-read PR has no test files, apply the same filesystem search described in the MANDATORY Pull Requests section of Step 1 — using [`references/security-test-directories.md`](references/security-test-directories.md) — before recording `No existing tests found` in the catalog.

   If the user runs `update test plan for issue #1234 including PRs`, skip the date comparison in step 3 and re-read **all** linked PRs regardless of their `updatedAt`.

5. Compare all gathered sources against the published comment and identify:
   - New acceptance criteria or scope items not covered by any existing scenario
   - Existing scenarios that are now incorrect due to changes in the issue or PRs
   - Sections that reference outdated information (wrong URLs, wrong feature flag names, wrong milestone)
   - Known Limitations that have been resolved or new ones that have emerged
   - New test files found in re-read PRs that should be reflected in automation coverage lines

6. Apply only the identified changes to the published comment content. Do not rewrite sections that are still accurate. If any identified changes require writing new scenarios, first read both reference files sequentially, one at a time:
   - `references/optional-scenarios.md` — Gherkin rules, tags, priority levels, and optional section templates
   - `references/output-formats.md` — scenario structure and automation coverage format

   When all new scenarios are written, run the Gherkin self-review from `references/output-formats.md`.

7. Before saving, review [`references/common-mistakes.md`](references/common-mistakes.md) and fix any issues found. Save the result to `.agents/tmp/test-plan-#<issue_number>.md`.

8. Tell the user exactly what changed and what was left unchanged, so they can review the diff before publishing.

9. After saving the draft, output the Sources Summary as defined in `references/output-formats.md`. The Sources Summary must include one row per linked PR showing whether it was re-read (with the reason: updated since `PLAN_PUBLISHED_AT`) or skipped (unchanged).

**publish / post**

Read the local file at `.agents/tmp/test-plan-#<issue_number>.md` and post its contents to GitHub as a comment. Do not regenerate or modify the content. After confirming the comment was posted successfully, delete the local file.

If the file does not exist, tell the user: "No draft found for issue #1234. Run `generate test plan for issue #1234` first."

---

## Step 1 — Gather all context

**Runs in:** draft mode; generate option A; update fallback. Skip entirely in publish mode.

**Execute all fetches sequentially — one at a time.** Wait for each call to complete before making the next one. This applies to all tools — `gh` CLI, GitHub MCP, Figma MCP, Google Drive MCP.

**Use `gh` CLI for all GitHub data fetches.** The GitHub MCP causes Cursor to freeze on large responses. Always use `gh` CLI as the primary method for fetching issues, comments, sub-issues, and PRs. Fall back to GitHub MCP only if `gh` is not installed or not authenticated — check with `gh auth status` before starting Step 1.

1. Fetch the full issue using `gh`: title, body, labels, assignees, linked issues, and all comments.
   ```
   gh issue view <number> --repo <owner>/<repo> --json number,title,body,labels,assignees,comments,projectItems
   ```
   If `gh` is unavailable, fall back to the GitHub MCP.
2. Parse the issue body and extract all URLs and categorize them:

   | Type | Pattern | Fetched in |
   |---|---|---|
   | Figma | `figma.com` | Point 4 |
   | Google Docs / Drive | `docs.google.com` or `drive.google.com` | Point 5 |
   | GitHub issues | `github.com/elastic` + `/issues/` | Point 6 |
   | GitHub PRs | `github.com/elastic` + `/pull/` | MANDATORY PRs section |
   | Other | anything else | Note in Known Limitations if relevant |
3. For each **image URL** found in the issue body or comments (typically `user-images.githubusercontent.com` or similar): fetch and analyze the image. Do not skip images — they frequently contain UI mockups, annotated screenshots, or acceptance criteria that are not described in text. Extract: UI layout and components visible, user flows implied by the design, labels, button names, states, error messages, and any annotations. Use all of this visual context when writing test scenarios.
4. For each **Figma link**: use the Figma MCP to fetch the design context. Fetch the specific node referenced in the URL if a `node-id` parameter is present — do not just fetch the file root. From the Figma design extract: component names and states, navigation flows, empty states, error states, loading states, and any interactions or annotations visible in the design. If the Figma MCP returns an error or the file is inaccessible:

   | Figma role | Action |
   |---|---|
   | Primary UX source for this feature | Ask the user before continuing |
   | Supplementary / supporting link | Flag in Known Limitations with ⚠️ and continue |
5. For each **Google Docs link**: use the Google Drive MCP to read the document content, if it is configured. If the Google Drive MCP is not available, note it in Known Limitations with a `⚠️` flag and continue — do not block on this.
6. For each **GitHub issue link** (not PRs — those are handled in the MANDATORY Pull Requests section below): fetch using `gh issue view <number> --repo <owner>/<repo> --json number,title,body,comments`. Fall back to GitHub MCP if `gh` is unavailable.

**MANDATORY — Parent issue (never skip this step if a parent exists):**

Check if the issue has a parent issue (visible in the "Relationships" or "Parent issue" section on the right sidebar). If it does:

1. Fetch the parent issue body, labels, and comments using `gh issue view <number> --repo <owner>/<repo> --json number,title,body,labels,comments`. Fall back to GitHub MCP if `gh` is unavailable.
2. For each **image URL** found in the parent: fetch and analyze it using the same approach as for the main issue — extract UI layout, component names, states, annotations, and any design context visible.
3. For each **Figma link** found in the parent: use the Figma MCP to fetch the design context. Parent epics frequently contain the most complete Figma designs for the whole project — treat these as high-value context.
4. Do not navigate further up — if the parent also has a parent, stop there. One level up is sufficient.
5. Do not read the parent's sub-issues (the siblings of the current issue) — they are out of scope.
6. Use the parent content as **background context only**: it informs the "why" and the overall design direction, but do not generate test scenarios based on the parent alone. Only use parent content to enrich scenarios that are already justified by the current issue.
7. Check the parent issue comments for an existing test plan: look for a comment whose body starts with `<!-- test-plan-generated -->`. If one exists, read it in full and store it as **parent test plan**. Do not treat it as a duplicate — use it in Step 2 to understand what is already covered at the epic level.

If the issue has no parent, skip this step.

**MANDATORY — Sub-issues (never skip this step):**

Look for a "Sub-issues" section in the issue body or metadata. Fetch **every** sub-issue using `gh issue view <number> --repo <owner>/<repo> --json number,title,body,comments` — without exception. Fall back to GitHub MCP if `gh` is unavailable. For each sub-issue: read the full title, body, all comments, all images, and all URLs. Apply the same context-gathering process recursively to each sub-issue. Treat sub-issue content as first-class context — it is as important as the parent issue.

For each sub-issue, also check its comments for an existing test plan: look for a comment whose body starts with `<!-- test-plan-generated -->`. If one exists, read it in full and store it as **sub-issue test plan for #<number>**. Collect all of them — they will be used in Step 2 to avoid duplication.

**Do not proceed to the PR step until all sub-issues have been fully read.**

**MANDATORY — Pull Requests and test coverage (never skip this step):**

PRs are the ground truth of what was actually built — their test files reveal what automated coverage already exists. Issue descriptions may be outdated.

Find all PRs linked to the issue. Look in:
- The "Development" section on the right sidebar of the issue (listed as linked PRs)
- The issue body (PR URLs mentioned inline)
- The issue comments (PRs referenced with `#number` or full URLs)
- Any sub-issue you have already read — apply this same step to each of them

For each PR found, fetch using `gh pr view <number> --repo <owner>/<repo> --json number,title,body,comments,files` and `gh pr diff <number> --repo <owner>/<repo>` for the diff. Fall back to GitHub MCP if `gh` is unavailable.
- **Description** — the PR body, which often contains context, decisions, and implementation notes not present in the issue
- **Review comments** — reviewer feedback and author responses frequently reveal edge cases, changed behaviour, or scope adjustments made during development
- **Changed files (diff)** — the actual code changes, subject to these limits:

  | Rule | Detail |
  |---|---|
  | Max files | 20 per PR |
  | Priority order | Test files → UI components → feature flags / permissions → feature-related files |
  | Skip if | File diff > 500 lines (note filename was skipped) |
  | Always skip | Binary files, generated files (`*.snap`, `*.lock`, `*.min.js`), translation files (`i18n`, `*.json`) |

**While reading each PR, identify and catalog all test files touched or added.** For each test file found, read its contents and extract:
- The test type: unit (`*.test.ts`), integration, API integration, or e2e (Cypress `*.cy.ts` or Scout)
- The file path
- The describe blocks and test names — these are the specific behaviours already covered

Store this as the **test coverage catalog** — it will be used in Step 3 to populate the automation coverage line of each scenario.

**If a PR has no test files**, search the filesystem for existing tests related to the feature. Use the source files modified in the PR as a starting point:
- Look for `*.test.ts` / `*.spec.ts` files adjacent to the modified source files
- Look in `__tests__/` folders near the modified files
- Use [`references/security-test-directories.md`](references/security-test-directories.md) to find the canonical test directories for the feature area being modified — this is faster than generic folder searches and covers all test types (unit, Cypress, Scout, FTR API integration)
- Search for e2e tests by looking for folders named `cypress`, `e2e`, or `scout` anywhere under `x-pack/solutions/security/`
- Search for integration and API integration tests by looking for folders named `integration`, `api_integration` anywhere under `x-pack/` that relate to the feature name or modified file names

If after all of the above no tests are found, record `No existing tests found` in the test coverage catalog for this PR and continue — do not block. This will surface as missing automation coverage in the test plan.

Read any test files found and add them to the test coverage catalog with the same detail level as above.

If a PR has already been read in a previous session and a draft file exists, do not re-read that PR unless the user explicitly asks.

**Do not proceed to Step 2 until all linked PRs and their sub-issue PRs have been read, within the limits above.**

**Context window management — large epics:**

If the issue has more than 5 sub-issues or more than 3 linked PRs:

| Priority | Source | Read order |
|---|---|---|
| 1 | Main issue body and images | Always read in full |
| 2 | Sub-issues | Most recently updated first; stop if context pressure detected |
| 3 | PRs | Most recently merged first; stop if context pressure detected |

If stopped early, continue to Step 2 with what you have and list every skipped source in the Sources Summary with `⚠️ Skipped — context limit reached`.

**Checkpoint before Step 2:** Apply the Core rule — if any source is missing, inaccessible, or contradictory, stop and ask the user before proceeding.

---

## Step 2 — Analyze the context

**Runs in:** draft mode; generate option A; update fallback. Skip entirely in publish mode.
- What feature or functionality is being built
- What the acceptance criteria are (explicit or implied)
- What the UI looks like (from Figma, if available)
- What technical constraints or edge cases are mentioned
- What is explicitly out of scope

**PR content takes priority over issue content when there is a conflict.**

Issue descriptions reflect original intent and may be outdated. If a PR description, review comment, or code change contradicts or extends what the issue says, always base the test scenarios on what the PR shows — that is what is actually implemented. When you detect a meaningful discrepancy, note it explicitly in Known Limitations with a `⚠️` flag.

**Cross-check existing test plans from parent and sub-issues.**

If any parent test plan or sub-issue test plans were found in Step 1:

1. Read each one and identify which scenarios and acceptance criteria they already cover.
2. Do not duplicate those scenarios in the test plan for the current issue. If a scenario is already covered in a sub-issue test plan, omit it here — or reference it with a note like: "Covered in test plan for #<sub-issue-number>."
3. Focus the current test plan on what is **unique to this issue** and not covered by any existing test plan in the hierarchy.
4. If the current issue has no unique scenarios of its own — because everything is already covered by sub-issue test plans — stop and tell the user:

   > "All acceptance criteria for this issue appear to be covered by existing test plans in its sub-issues (#X, #Y). How would you like to proceed?
   >
   > **A) Generate a summary test plan** — a short document that describes the feature at a high level and links to the existing sub-issue test plans for the detailed scenarios. Useful as an overview for reviewers or as a top-level entry point.
   >
   > **B) Generate a full test plan** — write all scenarios from scratch for this issue, incorporating everything from the sub-issues into a single self-contained document.
   >
   > **C) Cancel** — do not generate anything."

   Wait for the user's choice before proceeding. If the user selects **A**, write only the Overview, Feature Background, Scope, and a "Test Coverage" section that lists each sub-issue with a direct link to its test plan comment. If the user selects **B**, proceed to Step 3 normally.

**Detect the target release version.**

Look for `TARGET_VERSION` in these places, in priority order:

| Priority | Source | What to look for |
|---|---|---|
| 1 | Milestone | Milestone name assigned to the issue (e.g., `9.3`, `9.4`) |
| 2 | Project fields | Custom field named `Target`, `Target version`, `Fix version`, `Release`, or similar |
| 3 | Labels | Labels matching a version pattern (e.g., `v9.3`, `9.4`, `release:9.3`) |
| 4 | Issue body or comments | Explicit mentions like "target: 9.3" or "this will ship in 9.4" |

Use the first value found and store it as `TARGET_VERSION`. If no version is found in any of these places, **ask the user** before proceeding — do not silently leave an unknown value, since `TARGET_VERSION` affects whether upgrade scenarios are included and what versions they cover.

**Checkpoint before Step 3:** Apply the Core rule — if the mental model has gaps or ambiguities that could not be resolved from the sources, stop and ask the user before proceeding.

---

## Step 3 — Generate the test plan

**Runs in:** draft mode; update fallback. Skip entirely in publish mode.

Apply the Core rule before starting: if there is any remaining ambiguity about scope, acceptance criteria, or expected behaviour that was not resolved in Step 2, stop and ask the user now.

Write the test plan following the Document structure and Writing scenarios sections below.

**Immediately before writing the first scenario** — not before — read both reference files sequentially, one at a time:
- `references/optional-scenarios.md` — Gherkin rules, tags, priority levels, optional section templates, and formatting rules
- `references/output-formats.md` — scenario structure, automation coverage format, and Gherkin self-review checklist

When all scenarios are written, run the Gherkin self-review from `references/output-formats.md` and review [`references/common-mistakes.md`](references/common-mistakes.md) — fix any issues found before saving.

Before saving, append the following footer at the very end of the file — replacing `[model-identifier]` with your exact model string (e.g. `claude-sonnet-4-6`, `gpt-4o`) and `[YYYY-MM-DD]` with today's date:

```
---

*🤖 Generated by [model-identifier] on [YYYY-MM-DD]*
```

Then save the test plan to `.agents/tmp/test-plan-#<issue_number>.md`, add `.agents/tmp/` to `.gitignore` if not already there, and output the Sources Summary as defined in `references/output-formats.md`.

Tell the user:
> Draft saved to `.agents/tmp/test-plan-#<issue_number>.md`. Open it in the editor to review and edit — you can ask me to adjust any section before publishing. When you're happy with it, run: `publish test plan for issue #<issue_number>`
> ⚠️ This file is temporary. Do not commit it to the repository — it is listed in `.gitignore`.

### Document structure

Follow the template in [`references/document-structure.md`](references/document-structure.md) — it defines the required sections, their order, and the content expected in each.

### Optional sections

See [`references/optional-scenarios.md`](references/optional-scenarios.md) for the inclusion criteria and templates for each optional section. If it is not clear whether a section applies, ask the user before including — do not add sections speculatively.

### Writing scenarios

Only write scenarios for things confirmed by the issue, linked docs, or Figma designs. If something is unclear, ask the user first — see the Core rule at the top of this skill. Use `⚠️ Assumption: [describe assumption] — please confirm.` only as a fallback when the user is not available and the plan must move forward.

**For each scenario**, cross-reference the test coverage catalog built in Step 1 and write it using the scenario structure and automation coverage format defined in `references/output-formats.md`.

**Within each feature area, write scenarios in priority order: P0 first, then P1, then P2.** Assign priority based on impact as defined in `references/optional-scenarios.md`. After writing all scenarios, populate the Test Execution Notes section by listing every scenario by name under its priority level — do not leave it as a generic description.

---

## Step 4 — Post the test plan as a GitHub comment

**This step runs in publish mode only.** In draft mode, stop after Step 3.

1. Read the contents of `.agents/tmp/test-plan-#<issue_number>.md`. Publish it exactly as it is — do not regenerate or modify.
2. Ensure the first two lines of the file are exactly:
   ```
   <!-- test-plan-generated -->
   <!-- generated-by: [model-identifier] -->
   ```
   If they are not present, prepend them before posting. Use the same model identifier written in the footer.
3. Fetch all existing comments on the issue using `gh issue view <number> --repo <owner>/<repo> --json comments` and check for one whose body starts with `<!-- test-plan-generated -->`. **Always check before posting — creating a duplicate is an error.**

   Select the tool to use:

   | Tool | When |
   |---|---|
   | `gh` CLI | Available and authenticated — always prefer this. Verify with `gh auth status` first. |
   | GitHub MCP | Fallback if `gh` CLI is not available |
   | Neither | Stop — tell user to install `gh` with `brew install gh` and authenticate with `gh auth login` |

   Then post using the selected tool:

   | Existing comment? | `gh` CLI | GitHub MCP |
   |---|---|---|
   | Yes | `gh api --method PATCH /repos/<owner>/<repo>/issues/comments/<id> --field body=@file` | Edit the existing comment |
   | No | `gh issue comment <number> --repo <owner>/<repo> --body-file ...` | Create a new comment |

After posting by either method, delete the local file and confirm to the user with a direct link to the comment.