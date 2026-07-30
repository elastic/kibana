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
- [Acceptance criterion extraction and origin tagging](#acceptance-criterion-extraction-and-origin-tagging)
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

For each **Figma link**: use the Figma MCP. Extract component names and states, navigation flows, empty / error / loading states, and any interactions or annotations visible in the design.

### Why the flow looks the way it does

`get_design_context` is a **design-to-code** tool: it returns full React + Tailwind implementations, Code Connect snippets, component prop definitions, and design tokens. A single response can be 30–200 KB, and less than 10 % of that content is signal for test-plan writing. Historical runs that fanned out `get_design_context` across every child of a section routinely exhausted the agent's context window before any scenario was written (see [security-team#18320](https://github.com/elastic/security-team/issues/18320) validation dry-run).

The flow below is **metadata-first**:

- `get_metadata` gives every structural fact a test plan needs — component names, hierarchy, node types — for typically 1–2 calls total per link.
- `get_screenshot` gives visual verification when a scenario asserts on layout, section names, or CTAs. The default response is a short-lived URL plus a `curl` instruction (~300 bytes inline), so a `get_screenshot` **call** itself is effectively free in context terms. **Actually opening the returned PNG** — required whenever a scenario leans on visual layout or on a node's *name* (see Step 3 and *Name-vs-content mismatch* below) — consumes real vision tokens. The Step 5 cap below counts **opened PNGs**, not URL-only calls.
- `get_design_context` is reserved for the rare case where a test asserts on pixel-precise layout or exact CSS identifiers that neither the screenshot nor the metadata can supply. Prefer the other two tools by default.

### Step 1 — Parse the URL

Extract `fileKey` and `nodeId` from the URL, and route to the correct handler:

| URL path segment | Handler |
|---|---|
| `figma.com/design/:fileKey/:name?node-id=:nodeId` | Standard design file. Convert `-` to `:` in `nodeId`. Proceed to Step 2. |
| `figma.com/design/:fileKey/branch/:branchKey/:name` | Branched design file. Use `branchKey` as the `fileKey`. Proceed to Step 2. |
| `figma.com/board/:fileKey/...` | FigJam. Use `get_figjam`, then skip Step 2 (design-file structural inspection only). |
| `figma.com/slides/:fileKey/...` | Figma Slides. `get_metadata` is not supported — use `get_screenshot` for the referenced node and continue. |
| `figma.com/make/:makeFileKey/...` | Figma Make. Not supported by `get_metadata` / `get_design_context` — flag in Known Limitations with ⚠️ and continue. |
| Any design URL **without** `node-id` | Vague link — the URL points at the whole file. Call `get_metadata` with `fileKey` only to list top-level pages, then **stop and ask** the user which page or node matters before spending further calls. |

### Step 2 — Build the structural inventory with `get_metadata`

For design-file URLs with a `nodeId`, call `get_metadata` **exactly once**. The response is an XML tree of the node and its descendants — every layer, name, type, and hierarchical relationship in one payload.

From that XML, extract three lists and hold them as the "Figma inventory" for the link:

1. **Fetchable elements** — direct or nested children whose type is `frame`, `instance`, `section`, `component`, or `component_set`. These are the ones that map to real UI components (flyouts, panels, forms, etc.). Include `component` and `component_set` because a Figma link may target a component definition directly rather than a frame instance of it — the metadata inventory would come back empty without them.
2. **Leaf-shape elements** — `text`, `vector`, `rectangle` / `rounded-rectangle` / `ellipse` / `line` / `star` / `regular-polygon`. These are decorative or per-label; ignore them when writing scenarios, but count them if you need to explain to the user what a container holds.
3. **Nested containers** — `section` or `canvas` nodes below the root. Note them but do **not** recurse into their children via more `get_metadata` calls unless a scenario explicitly requires it.

The inventory alone is usually enough to write scenarios that assert on which flyouts / panels / states exist. Do **not** fan out to `get_design_context` at this step.

**Special case — canvas root, or oversized section root.** A `canvas` URL points at a whole Figma page and typically bundles dozens of unrelated frames; a large `section` root can do the same when a designer groups every state and variant of a screen under one section. Apply the same stop-and-ask in either case:

- Root is `canvas` (regardless of child count), **or**
- Root is `section` with **more than 20 fetchable children** (counted using the fetchable-element filter above — `frame` / `instance` / `section` / `component` / `component_set` — not raw XML children).

In either case, list the direct-child fetchable elements and **stop and ask** the user which are in scope before continuing. Do not build an inventory of the entire canvas or oversized section — that is exactly the fan-out this flow is meant to avoid. Whichever children the user excludes must be surfaced per Step 6 (Sources Summary partial-catalogue status + Known Limitations entry).

### Step 3 — Add visual verification with `get_screenshot` only where needed

Once scenarios are being drafted (Step 3 of the main workflow), some assertions need visual anchoring. Fetch a screenshot in either of these two cases:

- **Layout / order / CTA assertions** — e.g. *"the Overview tab is selected by default"*, *"the flyout body renders these sections in this order"*, *"the footer shows an 'Add to chat' and a 'Take action' CTA"*.
- **Name-anchored assertions** — whenever a scenario cites a node's *name* to establish what it is (e.g. *"the Analyzer flyout shows…"*). Figma metadata reports the layer name a designer typed, not what the layer depicts, and a stale or repurposed name is invisible from metadata alone; opening the PNG is the only way to catch the mismatch. See *Name-vs-content mismatch* below.

For each such assertion:

1. Pick the smallest node in the inventory that contains the visual detail (typically a single flyout frame or a specific state instance).
2. Call `get_screenshot` on that node. Default parameters are fine — the response is a URL plus a `curl` instruction, not an inline PNG. The call itself is effectively free in context terms.
3. Download the PNG via the `curl` instruction and read it. This step **consumes vision tokens** and counts against the Step 5 `get_screenshot` cap — the cap is on **opened PNGs**, not URL-only calls. Leave the URL in the Sources Summary as the reader-facing preview (the URL is short-lived — see Step 6).

The only case where step 3 above can be skipped is a strict geometry check that can be answered from the URL alone (dimensions, aspect ratio in headers). Do not skip it for anything that depends on what the image actually depicts — including any assertion that cites the node name.

Do **not** call `get_screenshot` speculatively on every child in a container. Only call it where a scenario would otherwise be unverifiable.

**Name-vs-content mismatch.** Figma metadata reports the layer name a designer typed, not what the layer actually depicts — designers sometimes rename or repurpose components without updating the label. This mismatch is invisible from metadata alone; catching it is precisely why step 3 above requires opening the PNG for name-anchored assertions. If the downloaded PNG visibly does not match the node name (e.g. a frame called `Analyzer` renders as a Notes flyout), treat the mismatch as first-class signal:

1. Trust the screenshot, not the name. Write scenarios only from what the image shows.
2. Do **not** write assertions grounded in the misleading name. In the `Analyzer` example, do not add analyzer-specific scenarios anchored on that node; either find a differently-named node that genuinely renders the analyzer or defer the scenario to Known Limitations.
3. Add a Known Limitations entry naming the node and the mismatch, so downstream reviewers know the metadata inventory alone was insufficient for that node.

### Step 4 — Escape hatch: `get_design_context`

Reserve `get_design_context` for the rare case where a test scenario needs pixel-precise layout data or exact EUI component identifiers that neither the metadata nor the screenshot can supply — for example a regression test asserting on a specific `data-test-subj` selector that only appears in the Code Connect snippet.

When calling it:

- Explain in a preceding chat line **why** the metadata + screenshot combination was insufficient.
- Fetch a single specific node, never a container fan-out.
- Extract the identifiers needed and drop the raw response — do not retain the full React code in working context.

If the scenario can be written without those identifiers by referring to visible text, ARIA role, or component name, prefer that path and skip `get_design_context` entirely.

### Step 5 — Session budget

To keep the agent's context healthy across the rest of Step 1 (parent issue, sub-issues, PRs, code catalog), cap the **total Figma MCP calls per session** at:

| Tool | Default per-session cap | Rationale |
|---|---|---|
| `get_metadata` | 3 | 1 per Figma link on the target + 1 for the parent's link + 1 spare. Nested-container recursion is not counted here — it should not happen. |
| `get_screenshot` | 8 opened PNGs | Enough for the P0 flyout + a handful of P1 states + 1–2 error/empty states. The cap is on **opened PNGs** (the vision-token cost), not on `get_screenshot` calls that only returned a URL. |
| `get_design_context` | 2 | The escape hatch above. If a plan needs more than 2, the plan is probably asserting on the wrong things. |
| `get_figjam` | 1 per FigJam link | FigJam is background context. |

These are **soft caps.** If a plan legitimately needs more (very large multi-flyout epic, several linked Figma files), announce the overage in chat before the extra call and note it in the Sources Summary. Do not silently exceed.

If a session hits the combined `get_screenshot` cap mid-draft, stop calling and switch to metadata-only reasoning for the remaining scenarios. Announce partial coverage in Sources Summary + Known Limitations per Step 6 below. Never continue silently — the user needs to see when the budget bit.

### Step 6 — Announce and propagate

- **Sources Summary.** One row per Figma link, describing what was fetched. Use one of the status cells from [`output-formats.md`](output-formats.md#sources-summary) — e.g. `✅ Metadata read (N fetchable children catalogued)` or `✅ Metadata read + 3 screenshots for visual verification`. When a screenshot was fetched, the URL from `get_screenshot` should be included in the status cell so the reader can open it — the URL is short-lived (Figma expires it after ~15 minutes), so treat it as a preview, not a stable reference.
- **Known Limitations.** Only add a ⚠️ entry when coverage is genuinely incomplete:
  - The user narrowed a canvas via stop-and-ask (`section` / `canvas`), and specific children were excluded from the inventory.
  - The session budget cap fired mid-draft and remaining scenarios could not be visually verified.
  - `get_metadata` returned an error (deleted / restructured node) or the file was inaccessible.
  - A scenario would have benefited from `get_design_context` but the escape hatch was intentionally skipped — record the missing precision so the automation writer knows.

  ```
  ⚠️ Figma canvas "🌈 Design Concepts": 3 of 40 direct-child frames catalogued
  (narrowed by user selection). The remaining 37 frames were out of scope for
  this test plan and may cover behaviour not represented in scenarios.
  ```

  Without this entry, Step 3 scenario writing and the Issue Clarity Assessment UX / UI dimension would treat the Figma as fully covered when it is not.

### Role after extraction

| Figma role | Action |
|---|---|
| Primary UX source for this feature | Ask the user before continuing if the metadata inventory disagrees with any AC. |
| Supplementary / supporting link | Fetch metadata only; skip screenshots unless a scenario specifically needs one. |

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
3. For each **Figma link** found: apply the full [Figma](#figma) flow above (URL parsing → metadata inventory → targeted screenshots → Sources Summary / Known Limitations propagation). Parent epics often contain the most complete designs — treat as high-value context.
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

For each sub-issue, check its comments for an existing test plan (body starts with `<!-- test-plan-generated -->`). If found, store as **sub-issue test plan for #<number>**. Collect all of them — they will be used in Step 2 to avoid duplication.

Do not proceed to the pull requests section until all sub-issues have been fully read.

---

## Acceptance criterion extraction and origin tagging

Run this step **after** all issue-corpus members have been fetched (target issue, parent issue if any, every sub-issue, every linked GitHub issue) and **before** reading the linked PRs in the next section.

Walk **every issue in the corpus** and extract every acceptance criterion — both explicit bullet points and implied requirements — into a single **flat acceptance criteria list** keyed by issue number. The list must include the target issue, the parent, every sub-issue, and every linked issue — not only sub-issues. Coverage Ratio and Step 2's consolidated checklist both depend on every issue's ACs being present and tagged.

**Origin tag** — assign exactly one to each AC entry:

| Tag | When |
|---|---|
| `issue` | The AC appears in **any** issue body or comment in the corpus (target, parent, sub-issue, or linked issue). |
| `pr` | The AC appears **only** in a PR description, PR diff, or PR review comment and not in any issue. |
| `both` | The AC appears in both at least one issue and at least one PR. |

PR sources do not exist yet at this point (the next section reads them); revisit the list while reading PRs to upgrade `issue` → `both` and to add new `pr` entries.

This list is a critical artifact: it feeds Step 2 (consolidated AC checklist), Step 3's self-review (complete coverage verification), and the Issue Clarity Assessment Coverage Ratio (`issue` vs `pr` classification per scenario).

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

**Build a PR artifacts inventory.** While reading each PR's file list and diff, identify every new or substantially modified: API route, service method, UI component/page, saved object type, schema definition, and feature flag. **For each artifact, record whether it was mentioned in any issue body/comment (`mentioned_in_issue: true`) or whether it appears only in the PR/code (`mentioned_in_issue: false`).** This flag is the per-artifact source signal that flows into the Issue Coverage Ratio: scenarios written against an artifact whose `mentioned_in_issue` is `false` will count as PR-derived. Each distinct artifact is a candidate for at least one test scenario. Store this inventory — it will be used in Step 3's self-review to verify no implemented artifact is left without a corresponding scenario, and in the Issue Clarity Assessment to compute the Coverage Ratio.

**If a PR has no test files**, search the filesystem for existing tests:
- Look for `*.test.ts` / `*.spec.ts` files adjacent to the modified source files
- Look in `__tests__/` folders near the modified files
- Use [`security-test-directories.md`](security-test-directories.md) to find canonical test directories for the feature area
- Search for folders named `cypress`, `e2e`, or `scout` anywhere under `x-pack/solutions/security/`
- Search for folders named `integration`, `api_integration` anywhere under `x-pack/` that relate to the feature name or modified file names

If no tests are found after all of the above, record `No existing tests found` in the catalog for this PR and continue — do not block. If a PR was already read in a previous session and a draft file exists, do not re-read it unless the user explicitly asks.

### Orphan PRs

A PR is **orphan** when its title or scope clearly relates to the target issue (or any sub-issue) but no formal cross-reference exists in either direction — no `Closes #N`, no mention in any issue body or timeline. Identify orphan PRs **after** the regular cross-reference walk and **before** adding them to the corpus.

| Signal | Action |
|---|---|
| PR title contains the feature name or area, AND it was opened/updated in the relevant window | Open the PR. Check its body and the issue timeline for a reference (`Closes #N`, `Tracked by`, `Refs #N`, mentioned in a review comment) |
| Reference found after deeper inspection (timeline comment, PR review, sub-issue body) | **Not orphan.** Add to the primary corpus as usual |
| No reference found in either direction after the walk above | **Orphan.** Do not add to the primary corpus. Record under Known Limitations with `⚠️` and **stop and ask the user** whether to include it before proceeding to Step 2 |

**Why this matters.** Orphan PRs are the single most common cause of silent scope creep in generated test plans. Absorbing them quietly would produce scenarios traceable to no issue AC, breaking the Core rule. Explicit handling preserves traceability and makes the relationship visible to the reader.

When asking the user, surface:

| Field | Example |
|---|---|
| PR number + URL | `#269123` |
| One-line title | *"Add validation to X importer"* |
| Best-guess relation to the target | *"Likely implements AC4 of #16898, but no explicit reference"* |
| Default if no response | Exclude from corpus; keep in Known Limitations with `⚠️` |

---

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
