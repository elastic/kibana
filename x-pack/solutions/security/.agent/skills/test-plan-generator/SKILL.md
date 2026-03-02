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

**Producing a test plan with invented or unverified content is a worse outcome than asking a clarifying question.**

---

## Modes of operation

Detect the mode from the user's phrasing before doing anything else.

**Draft mode** — triggered by phrases like:
- `generate test plan for issue #1234`
- `create test plan for issue #1234`
- `write test plan for issue #1234`

**Before starting Step 1**, check whether a published test plan already exists for this issue: look for a comment on the issue whose body starts with `<!-- test-plan-generated -->`.

If one exists, stop and tell the user:

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
4. If gaps are found: add only the missing scenarios and update only the outdated sections. Do not rewrite sections that are still accurate. Save the result to `.cursor/tmp/test-plan-#<issue_number>.md` and tell the user exactly what was added or changed.
5. After saving the draft, read `references/output-formats.md` and output the Sources Summary as specified there.
6. If no gaps are found: tell the user "The existing test plan appears to be up to date. No changes are needed." Do not save a draft file.

If the user selects **B**, proceed normally through Steps 1, 2, and 3.

If no published test plan exists, proceed normally through Steps 1, 2, and 3.

Generate the test plan and save it to `.cursor/tmp/test-plan-#<issue_number>.md`. Create the `.cursor/tmp/` directory if it does not exist. Do not post anything to GitHub. Do not save the file anywhere else in the repository.

Tell the user: "Draft saved to `.cursor/tmp/test-plan-#<issue_number>.md`. Open it in the editor to review and edit. When you're happy with it, run: `publish test plan for issue #<issue_number>`"

Also add `.cursor/tmp/` to `.gitignore` if it is not already there.

---

**Update mode** — triggered by phrases like:
- `update test plan for issue #1234`
- `regenerate test plan for issue #1234`

Update mode is incremental. Its goal is to produce only the changes needed, not to rewrite the plan from scratch.

1. Fetch the published comment on the issue that starts with `<!-- test-plan-generated -->`. This is the current state of the test plan — use it as the base.
2. Re-fetch the issue body, all sub-issues, and any comments to detect what has changed since the comment was published. Do not re-read PRs unless the user explicitly includes "including PRs" in the command.
3. Compare the sources against the published comment and identify:
   - New acceptance criteria or scope items not covered by any existing scenario
   - Existing scenarios that are now incorrect due to changes in the issue or PRs
   - Sections that reference outdated information (wrong URLs, wrong feature flag names, wrong milestone)
   - Known Limitations that have been resolved or new ones that have emerged
4. Apply only the identified changes to the published comment content. Do not rewrite sections that are still accurate.
5. Save the result to `.cursor/tmp/test-plan-#<issue_number>.md`.
6. Tell the user exactly what changed and what was left unchanged, so they can review the diff before publishing.
7. After saving the draft, read `references/output-formats.md` and output the Sources Summary as specified there.

**If no published comment exists** (no comment starting with `<!-- test-plan-generated -->`), run a full draft generation: proceed through Steps 1, 2, and 3 exactly as in draft mode, reading all sources from scratch. The mode-scoping note at the top of Step 1 does not apply in this fallback case.

**If the user runs `update test plan for issue #1234 including PRs`**, re-read all linked PRs in addition to the issue, applying the same limits as draft mode (max 20 files per PR, skip files over 500 lines, skip generated/binary/translation files).

---

**Publish mode** — triggered by phrases like:
- `publish test plan for issue #1234`
- `post test plan for issue #1234`

Read the local file at `.cursor/tmp/test-plan-#<issue_number>.md` and post its contents to GitHub as a comment. Do not regenerate or modify the content. After confirming the comment was posted successfully, delete the local file.

If the file does not exist, tell the user: "No draft found for issue #1234. Run `generate test plan for issue #1234` first."

---

## Step 1 — Gather all context

**This step runs in draft mode** and in update mode when falling back to a full draft (see the Modes section above). In normal update mode, follow the workflow in the Modes section instead of these steps. In publish mode, skip directly to Step 4.

1. Use the GitHub MCP to fetch the full issue: title, body, labels, assignees, linked issues, and all comments.
2. Parse the issue body and extract all URLs. Categorize them as:
   - Figma links (contain `figma.com`)
   - Google Docs / Drive links (contain `docs.google.com` or `drive.google.com`)
   - GitHub issue or PR links (contain `github.com/elastic`)
   - Any other external links
3. For each **image URL** found in the issue body or comments (typically `user-images.githubusercontent.com` or similar): fetch and analyze the image. Do not skip images — they frequently contain UI mockups, annotated screenshots, or acceptance criteria that are not described in text. Extract: UI layout and components visible, user flows implied by the design, labels, button names, states, error messages, and any annotations. Use all of this visual context when writing test scenarios.
4. For each **Figma link**: use the Figma MCP to fetch the design context. Fetch the specific node referenced in the URL if a `node-id` parameter is present — do not just fetch the file root. From the Figma design extract: component names and states, navigation flows, empty states, error states, loading states, and any interactions or annotations visible in the design. If the Figma MCP returns an error or the file is inaccessible: if the design appears to be the primary source of UX specification for this feature, **ask the user** how to proceed before continuing; if the Figma link appears supplementary, note it in Known Limitations with a `⚠️` flag and continue.
5. For each **Google Docs link**: use the Google Drive MCP to read the document content, if it is configured. If the Google Drive MCP is not available, note it in Known Limitations with a `⚠️` flag and continue — do not block on this.
6. For each **GitHub issue or PR link**: use the GitHub MCP to fetch that issue/PR body and comments.

**MANDATORY — Parent issue (never skip this step if a parent exists):**

Check if the issue has a parent issue (visible in the "Relationships" or "Parent issue" section on the right sidebar). If it does:

1. Fetch the parent issue body, labels, and comments using the GitHub MCP.
2. For each **image URL** found in the parent: fetch and analyze it using the same approach as for the main issue — extract UI layout, component names, states, annotations, and any design context visible.
3. For each **Figma link** found in the parent: use the Figma MCP to fetch the design context. Parent epics frequently contain the most complete Figma designs for the whole project — treat these as high-value context.
4. Do not navigate further up — if the parent also has a parent, stop there. One level up is sufficient.
5. Do not read the parent's sub-issues (the siblings of the current issue) — they are out of scope.
6. Use the parent content as **background context only**: it informs the "why" and the overall design direction, but do not generate test scenarios based on the parent alone. Only use parent content to enrich scenarios that are already justified by the current issue.
7. Check the parent issue comments for an existing test plan: look for a comment whose body starts with `<!-- test-plan-generated -->`. If one exists, read it in full and store it as **parent test plan**. Do not treat it as a duplicate — use it in Step 2 to understand what is already covered at the epic level.

If the issue has no parent, skip this step.

**MANDATORY — Sub-issues (never skip this step):**

Look for a "Sub-issues" section in the issue body or metadata. Use the GitHub MCP to fetch **every** sub-issue without exception. For each sub-issue: read the full title, body, all comments, all images, and all URLs. Apply the same context-gathering process recursively to each sub-issue. Treat sub-issue content as first-class context — it is as important as the parent issue.

For each sub-issue, also check its comments for an existing test plan: look for a comment whose body starts with `<!-- test-plan-generated -->`. If one exists, read it in full and store it as **sub-issue test plan for #<number>**. Collect all of them — they will be used in Step 2 to avoid duplication.

**Do not proceed to the PR step until all sub-issues have been fully read.**

**MANDATORY — Pull Requests and test coverage (never skip this step):**

Issue descriptions often reflect the original intent, not the final implementation. PRs contain the ground truth of what was actually built — and their test files reveal what is already covered by automated tests.

Find all PRs linked to the issue. Look in:
- The "Development" section on the right sidebar of the issue (listed as linked PRs)
- The issue body (PR URLs mentioned inline)
- The issue comments (PRs referenced with `#number` or full URLs)
- Any sub-issue you have already read — apply this same step to each of them

For each PR found, use the GitHub MCP to fetch:
- **Description** — the PR body, which often contains context, decisions, and implementation notes not present in the issue
- **Review comments** — reviewer feedback and author responses frequently reveal edge cases, changed behaviour, or scope adjustments made during development
- **Changed files (diff)** — the actual code changes. Apply the following limits to avoid context overflow:
  - Read a **maximum of 20 files** per PR
  - Prioritize in this order: test files, UI component files, files related to feature flags or permissions, files whose name relates to the feature being tested
  - Skip files over **500 lines of diff** — note the filename was skipped but too large to process
  - Skip binary files, generated files (`*.snap`, `*.lock`, `*.min.js`), and translation files (`i18n`, `*.json` translation bundles)

**While reading each PR, identify and catalog all test files touched or added.** For each test file found, read its contents and extract:
- The test type: unit (`*.test.ts`), integration, API integration, or e2e (Cypress `*.cy.ts` or Scout)
- The file path
- The describe blocks and test names — these are the specific behaviours already covered

Store this as the **test coverage catalog** — it will be used in Step 3 to populate the automation coverage line of each scenario.

**If a PR has no test files**, search the filesystem for existing tests related to the feature. Use the source files modified in the PR as a starting point:
- Look for `*.test.ts` / `*.spec.ts` files adjacent to the modified source files
- Look in `__tests__/` folders near the modified files
- Search for e2e tests by looking for folders named `cypress`, `e2e`, or `scout` anywhere under `x-pack/solutions/security/`
- Search for integration and API integration tests by looking for folders named `integration`, `api_integration` anywhere under `x-pack/` that relate to the feature name or modified file names

Read any test files found and add them to the test coverage catalog with the same detail level as above.

If a PR has already been read in a previous session and a draft file exists, do not re-read that PR unless the user explicitly asks.

**Do not proceed to Step 2 until all linked PRs and their sub-issue PRs have been read, within the limits above.**

**Checkpoint before Step 2:** Review everything gathered. If any source is missing, inaccessible, or contradictory — stop and ask the user before moving on. Do not proceed to analysis with known gaps.

---

## Step 2 — Analyze the context

**This step runs in draft mode only** (or in update mode when falling back to a full draft — see above). For publish mode, skip directly to Step 4.

Before writing anything, build a mental model of:
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

Look for the target version in the following places, in order of priority:

1. **Milestone** — the milestone assigned to the issue (e.g., `9.3`, `9.4`)
2. **Project fields** — if the issue belongs to a GitHub Project, check for a custom field named `Target`, `Target version`, `Fix version`, `Release`, or similar
3. **Labels** — look for labels that match a version pattern (e.g., `v9.3`, `9.4`, `release:9.3`)
4. **Issue body or comments** — look for explicit mentions like "target: 9.3", "this will ship in 9.4", or similar

Use the first value found and store it as `TARGET_VERSION`. If no version is found in any of these places, **ask the user** before proceeding — do not silently leave an unknown value, since `TARGET_VERSION` affects whether upgrade scenarios are included and what versions they cover.

**Checkpoint before Step 3:** If the mental model built in this step has gaps — unclear acceptance criteria, contradictory sources with no obvious resolution, ambiguous scope — stop and ask the user before writing any scenarios. Writing scenarios based on incomplete or uncertain analysis produces a test plan that requires significant rework.

---

## Step 3 — Generate the test plan

**This step runs in draft mode** (and in update mode when falling back to a full draft — see above). In publish mode, skip directly to Step 4.

**Before writing anything — ask if in doubt.** If there is any remaining ambiguity about scope, acceptance criteria, or expected behaviour that was not resolved in Step 2, stop and ask the user now. It is much cheaper to ask one question before writing than to rewrite sections afterwards.

Write the test plan, save it to `.cursor/tmp/test-plan-#<issue_number>.md`, and add `.cursor/tmp/` to `.gitignore` if not already there.

Tell the user:
> Draft saved to `.cursor/tmp/test-plan-#<issue_number>.md`. Open it in the editor to review and edit — you can ask me to adjust any section before publishing. When you're happy with it, run: `publish test plan for issue #<issue_number>`
> ⚠️ This file is temporary. Do not commit it to the repository — it is listed in `.gitignore`.

After saving the draft, read `references/output-formats.md` and output the Sources Summary as specified there.

### Document structure (in this exact order)

1. `# Test Plan: [Feature Name]`
2. **Overview** — one paragraph explaining what the test plan covers and the scope of validation
3. **Feature Background** — why this feature exists, what problem it solves
4. **Scope** — what is included and what is explicitly excluded
5. **Terminology** _(optional)_ — only include if the issue or sub-issues use domain-specific terms that need definition to understand the scenarios. Omit entirely if no special terminology is needed.
6. **Assumptions** — always include. Document the baseline conditions that apply to all scenarios unless stated otherwise: license level, RBAC baseline (what role the test user has), data setup (what pre-existing data is assumed), and deployment type (self-managed, serverless, etc.).
7. **Acceptance Criteria** — numbered list
8. **Known Limitations** — constraints or deferred functionality
9. **Test Scenarios** — the core section, organized by feature areas
10. **Test Coverage Summary** — total scenario count, areas covered, and a summary of automated vs manual coverage
11. **Test Execution Notes** — priority levels and execution order

Only include a Permission Testing Matrix and RBAC Scenarios if the issue explicitly mentions roles, permissions, or access control.

### Optional sections

Read [`references/optional-scenarios.md`](references/optional-scenarios.md) before writing any scenarios. It contains the Gherkin templates for all optional sections, the Gherkin syntax rules, tags, priority levels, and GitHub comment formatting rules.

Include each optional section only when the evidence clearly supports it. If it is not clear whether a section applies, ask the user before including it — do not include scenarios speculatively.

| Section | Include if | Template |
|---|---|---|
| **RBAC** | Issue explicitly mentions roles, permissions, or access control | None — write scenarios manually based on the roles described in the issue |
| **Multi-space** | Feature involves UI, data, or configuration that could differ between Kibana spaces | See references file |
| **Multi-tenant** | Feature involves data ingestion, index patterns, or configuration in a Serverless or ECH deployment | See references file |
| **Upgrade** | Feature modifies stored data, index mappings, saved objects, configuration, or navigation structure | See references file |
| **CCS** | Feature queries Elasticsearch indices — especially Alerts index or detection rules | See references file |

### Writing scenarios

Only write scenarios for things confirmed by the issue, linked docs, or Figma designs. If something is unclear, ask the user first — see the Core rule at the top of this skill. Use `⚠️ Assumption: [describe assumption] — please confirm.` only as a fallback when the user is not available and the plan must move forward.

**For each scenario**, before writing it, cross-reference the test coverage catalog built in Step 1. Find all tests whose describe blocks or test names match the behaviour described in the scenario. Then write the scenario using this structure:
````markdown
#### Scenario: <title>

**Automation coverage**: <result of cross-reference — see rules below>
```gherkin
Given ...
When ...
Then ...
```
````

**Automation coverage rules:**
- List every matching test individually with its type and file path. Example: `2 unit tests (alerts.test.ts — "should render alert row"`, `"should filter by status"``), 1 e2e test (alerts.cy.ts — "displays alert in table")`.
- If tests of multiple types cover the scenario, list each type separately.
- If no tests cover the scenario, write: `No existing tests found covering this scenario.`
- Never aggregate counts without naming the specific tests — the goal is full traceability, not a summary number.

---

## Step 4 — Post the test plan as a GitHub comment

**This step runs in publish mode only.** In draft mode, stop after Step 3.

1. Read the contents of `.cursor/tmp/test-plan-#<issue_number>.md`. Publish it exactly as it is — do not regenerate or modify.
2. Ensure the first line of the file is exactly `<!-- test-plan-generated -->`. If it is not, prepend it before posting.

**Try the GitHub MCP first.** If the GitHub MCP tools are available in this session:

3. Use the GitHub MCP to **fetch all comments** on the issue.
4. Search every comment for one whose body starts with `<!-- test-plan-generated -->`. Do not assume there is no existing comment without having explicitly read the full comment list first.
5. **If a matching comment is found:** edit that comment with the file contents. Do not create a new comment.
6. **If no matching comment is found:** create a new comment.
7. After confirming the comment was posted successfully, **delete the local file**.
8. Confirm to the user with a direct link to the updated or newly created comment on the issue.

**If the GitHub MCP tools are not available in this session**, fall back to the `gh` CLI:

3. Check that `gh` is installed and authenticated by running `gh auth status`. If it fails, stop and tell the user: "Neither the GitHub MCP nor the `gh` CLI are available. Install `gh` with `brew install gh` and authenticate with `gh auth login`, then try again."
4. Fetch existing comments to check for a previous test plan: `gh issue view <issue_number> --repo elastic/kibana --comments --json comments`
5. Search the output for a comment whose body starts with `<!-- test-plan-generated -->`.
6. **If a matching comment is found:** edit it with `gh api --method PATCH /repos/elastic/kibana/issues/comments/<comment_id> --field body=@.cursor/tmp/test-plan-#<issue_number>.md`
7. **If no matching comment is found:** post a new comment with `gh issue comment <issue_number> --repo elastic/kibana --body-file .cursor/tmp/test-plan-#<issue_number>.md`
8. After confirming the comment was posted successfully, **delete the local file**.
9. Confirm to the user with a direct link to the updated or newly created comment on the issue.

**Creating a duplicate test plan comment is an error.** Always fetch and check existing comments before creating a new one.