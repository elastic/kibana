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
- `get_screenshot` gives visual verification when a scenario asserts on layout, section names, or CTAs. Its response shape depends on the Figma MCP server / Cursor version: it may return a short-lived URL plus a `curl` instruction (~300 bytes inline), **or** the PNG bytes inline as base64. In the URL-only case the call itself is effectively free in context terms; in the base64 case the response already carries the pixels and the vision cost lands with the call. **Actually opening the returned PNG** — required whenever a scenario leans on visual layout or on a node's *name* (see Step 3 and *Name-vs-content mismatch* below) — consumes real vision tokens either way. The Step 5 cap below counts **opened PNGs** (the vision-token cost), whichever response format delivered them: a URL response that is never opened does not count, an inline-base64 response always does.
- `get_design_context` is reserved for the rare case where a test asserts on pixel-precise layout or exact CSS identifiers that neither the screenshot nor the metadata can supply. Prefer the other two tools by default. **Exception:** for **Figma Make** links, `get_design_context` is not a reserve — it is the only supported tool (neither `get_metadata` nor `get_screenshot` is supported for Make), so it is the mandatory path for every Make link. See [Step 1](#step-1--parse-the-url) URL routing and the [*Figma Make branch*](#step-4--escape-hatch-get_design_context) in Step 4.

### When each sub-step runs (phase map)

The six sub-steps below do **not** all run at the same point in the main workflow. Follow this mapping so an early phase never spends screenshot budget or propagates a Sources Summary row it does not yet have:

| Figma sub-step | Main-workflow phase where it runs | What actually happens |
|---|---|---|
| **Step 1** — Parse the URL | Main **Step 1** (context gathering — target issue, parent issue, sub-issues, PRs) | Extract `fileKey` / `nodeId`, route by URL shape. No MCP call yet in this phase. |
| **Step 2** — Metadata inventory (`get_metadata`) | Main **Step 1** (same call site as Step 1 above) | One `get_metadata` per **design-file** Figma link (paths `figma.com/design/…`) to build the structural inventory. Includes any `stop-and-ask` for canvas or oversized-section roots. FigJam, Slides, and Make links do **not** run this sub-step at all — see their explicit Step 1 handlers below. |
| **Step 1 exceptions** — `get_figjam` (FigJam links) | Main **Step 1** (same call site as Step 1 above) | FigJam is background context and has no metadata equivalent. One `get_figjam` call per FigJam link, made at Step 1 alongside the URL parse. The call replaces the missing metadata step; no further Figma sub-step runs for a FigJam link. Sources Summary uses [`✅ FigJam read`](output-formats.md#sources-summary). |
| **Step 3** — Targeted `get_screenshot` (design + Slides) | Main **Step 3** (scenario drafting) | For **design-file** links: fetch — and open — a PNG when a scenario being drafted needs visual verification or a name-anchored check. For **Slides** links catalogued in Step 1 (marked *awaiting Step 3 (screenshot)*): call `get_screenshot` on the recorded node here — Slides is screenshot-only (no metadata / no design-context), so Step 3 is the mandatory path for a Slides link even when no visual-anchoring trigger fired. |
| **Step 4** — Escape hatch (`get_design_context`) | Main **Step 3** (scenario drafting) | Rare; only when a scenario needs identifiers metadata + screenshot cannot supply. Also the mandatory path for **Figma Make** links catalogued in Step 1 — `get_metadata` is Make-unsupported, so the design-context call replaces the metadata step for those links, and still runs here (not in Step 1) so it competes for the same budget as every other `get_design_context` call. |
| **Step 5** — Session budget | Main **Step 3** (enforced whenever a `get_screenshot` / `get_design_context` call would fire) | Hard cap counted across the whole session, with a single explicit overage path (announce → user approval → raised cap on approval; **per-tool fallback + KL** on decline — the fallback shape differs by which tool's cap fired, see the [Step 5 body table](#step-5--session-budget)). |
| **Step 6** — Announce & propagate (Sources Summary / Known Limitations) | Main **Step 3** — first written during scenario drafting, then refreshed during *Saving the draft* sub-step 3 (draft coherence review — [`SKILL.md`](../SKILL.md#saving-the-draft)). In update mode the refresh runs inside [`mode-update.md`](mode-update.md) Step 6 instead. | Sources Summary row per Figma link and any Known Limitations entries — cannot be written until the scenarios that consume them exist. |

Put concretely: during main **Step 1** ("apply the Figma flow" while gathering the target issue, parent, sub-issues, or PRs), run **only Figma Step 1 + Step 2** — nothing else. `get_screenshot`, `get_design_context`, and Sources Summary / Known Limitations propagation are deferred to main **Step 3** where the scenarios that motivate them are being written. Phrases like *"apply the full Figma flow"* elsewhere in this file are shorthand for that split — they never mean "spend screenshot budget while still gathering issues".

### Step 1 — Parse the URL

Extract `fileKey` and `nodeId` from the URL, and route to the correct handler:

| URL path segment | Handler |
|---|---|
| `figma.com/design/:fileKey/:name?node-id=:nodeId` | Standard design file. Convert `-` to `:` in `nodeId`. Proceed to Step 2. |
| `figma.com/design/:fileKey/branch/:branchKey/:name` | Branched design file. Use `branchKey` as the `fileKey`. Proceed to Step 2. |
| `figma.com/board/:fileKey/...` | FigJam. Call `get_figjam` **here** as a Step 1 exception (see phase map) — FigJam is background context, has no metadata equivalent, and doesn't drive scenarios, so deferring buys nothing. Record the response in the Sources Summary as `✅ FigJam read` and skip every subsequent Figma sub-step for this link. |
| `figma.com/slides/:fileKey/:name?node-id=:nodeId` | Figma Slides. `get_metadata` and `get_design_context` are not supported; only `get_screenshot` works. Do **not** call `get_screenshot` here — like Make, defer the call to main **Step 3** so it competes for the same `get_screenshot` budget as every other screenshot. Catalog the Slides link (record `fileKey`, `nodeId` from the URL) and mark it as *awaiting Step 3 (screenshot)*. In main Step 3, the Slides branch invokes `get_screenshot` on the recorded node. If the URL has **no** `node-id`, apply the *Any design/Slides URL without `node-id`* stop-and-ask rule at the bottom of this table instead — a Slides screenshot without a node id has no valid target. |
| `figma.com/make/:makeFileKey/...` | Figma Make. `get_metadata` is not supported (Design-only), so there is no structural inventory step for Make files. Do **not** call `get_design_context` here — the [phase map](#when-each-sub-step-runs-phase-map) reserves that call for main **Step 3** so it can compete for the same budget as every other design-context call and cannot be fetched before any scenario motivates it. Catalog the Make link (record `fileKey = makeFileKey`, `nodeId = 0:1` — the single implicit Make root, per the tool description) and mark it as *awaiting Step 4 (design-context)*. In main Step 3, follow [Step 4](#step-4--escape-hatch-get_design_context) below for the Make branch: it invokes `get_design_context` with the recorded params, records the Sources Summary row per [`output-formats.md`](output-formats.md#sources-summary), and — because `get_screenshot` is **Make-unsupported** (Figma's screenshot tool covers Design / FigJam / Slides only) — requires a ⚠️ Known Limitations entry whenever any scenario derived from the Make link needs visual, layout, or name-anchored verification. Additionally add a ⚠️ entry when the `get_design_context` response itself fails or returns insufficient detail. |
| Any design or Slides URL **without** `node-id` | Vague link — the URL points at the whole file. For a design URL, call `get_metadata` with `fileKey` only to list top-level pages, then **stop and ask** the user which page or node matters before spending further calls. For a Slides URL, there is no metadata equivalent to list — **stop and ask** the user for the specific node id (from the Slides deck) before continuing; do not call `get_screenshot` with only a `fileKey`. |

### Step 2 — Build the structural inventory with `get_metadata`

For design-file URLs with a `nodeId`, call `get_metadata` **exactly once**. The response is an XML tree of the node and its descendants — every layer, name, type, and hierarchical relationship in one payload.

From that XML, extract three lists and hold them as the "Figma inventory" for the link:

Before applying any of the filters below, **case-normalize the `type` attribute of every node in the XML response to lowercase** (e.g. `FRAME` → `frame`, `COMPONENT_SET` → `component_set`) and match against the lowercase literals used in this file. Today's Figma MCP happens to emit lowercase, but the underlying Figma API type enum is uppercase and other clients (Desktop MCP, future MCP versions) may forward it as-is; without normalization the filters below would silently return zero fetchable nodes and every downstream count / threshold check would be wrong. Apply the same normalization anywhere else in this file that references a specific node type (Step 2 special-case rules, Step 6 KL triggers, etc.).

1. **Fetchable elements** — the root itself (when its own type is `frame`, `instance`, `section`, `component`, or `component_set`) plus any direct or nested children of the same types. Including the root matters for URLs that point directly at a `component` / `component_set` whose children are only leaf shapes: without counting the root the inventory would be empty even though a real UI element was linked. Include `component` and `component_set` because a Figma link may target a component definition directly rather than a frame instance of it — the metadata inventory would come back empty without them.
2. **Leaf-shape elements** — `text`, `vector`, `rectangle` / `rounded-rectangle` / `ellipse` / `line` / `star` / `regular-polygon`. These are decorative or per-label; ignore them when writing scenarios, but count them if you need to explain to the user what a container holds.
3. **Nested containers** — `section` or `canvas` nodes below the root. Note them but do **not** recurse into their children via more `get_metadata` calls unless a scenario explicitly requires it.

The inventory alone is usually enough to write scenarios that assert on which flyouts / panels / states exist. Do **not** fan out to `get_design_context` at this step.

**Special case — canvas root, or oversized section root.** A `canvas` URL points at a whole Figma page and typically bundles dozens of unrelated frames; a large `section` root can do the same when a designer groups every state and variant of a screen under one section. Apply the same stop-and-ask in either case:

- Root is `canvas` (regardless of child count), **or**
- Root is `section` with **more than 20 fetchable children** — where "children" means direct fetchable descendants of the root (using the case-normalized fetchable-element filter above — `frame` / `instance` / `section` / `component` / `component_set` — not raw XML children). The root itself is not counted in this specific 20-threshold check; it is only counted in the inventory total N reported in the Sources Summary.

In either case, list the direct-child fetchable elements and **stop and ask** the user which are in scope before continuing. Do not build an inventory of the entire canvas or oversized section — that is exactly the fan-out this flow is meant to avoid. Whichever children the user excludes must be surfaced per Step 6 (Sources Summary partial-catalogue status + Known Limitations entry).

### Step 3 — Add visual verification with `get_screenshot` only where needed

Once scenarios are being drafted (Step 3 of the main workflow), some assertions need visual anchoring. Fetch a screenshot in either of these two cases:

- **Layout / order / CTA assertions** — e.g. *"the Overview tab is selected by default"*, *"the flyout body renders these sections in this order"*, *"the footer shows an 'Add to chat' and a 'Take action' CTA"*.
- **Name-anchored assertions** — whenever a scenario cites a node's *name* to establish what it is (e.g. *"the Analyzer flyout shows…"*). Figma metadata reports the layer name a designer typed, not what the layer depicts, and a stale or repurposed name is invisible from metadata alone; opening the PNG is the only way to catch the mismatch. See *Name-vs-content mismatch* below.

For each such assertion:

1. Pick the smallest node in the inventory that contains the visual detail (typically a single flyout frame or a specific state instance).
2. Call `get_screenshot` on that node. Default parameters are fine. The response is either a short-lived URL plus a `curl` instruction, **or** the PNG bytes inline as base64 — the two official Figma MCP response shapes; do not tune params to force one over the other. In the URL case the call itself is effectively free in context terms; in the inline-base64 case the pixels are already in the response.
3. Actually **open** the PNG:
   - **URL response** — fetch the PNG via the `curl` instruction and read it. Also leave the URL in the Sources Summary as the reader-facing preview (the URL is short-lived — see Step 6).
   - **Inline base64 response** — the pixels are already attached to the response; no extra fetch is needed. There is no shareable URL to include in the Sources Summary in this case; use the node name/id as the reference instead of a link.

   Either way, this step **consumes vision tokens** and counts against the Step 5 `get_screenshot` cap — the cap is on **opened PNGs**, whichever response format delivered them (URL-only responses that were never opened do not count).

The only case where step 3 above can be skipped is a strict geometry check that can be answered from the URL alone (dimensions, aspect ratio in headers). Do not skip it for anything that depends on what the image actually depicts — including any assertion that cites the node name.

Do **not** call `get_screenshot` speculatively on every child in a container. Only call it where a scenario would otherwise be unverifiable.

**Name-vs-content mismatch.** Figma metadata reports the layer name a designer typed, not what the layer actually depicts — designers sometimes rename or repurpose components without updating the label. This mismatch is invisible from metadata alone; catching it is precisely why step 3 above requires opening the PNG for name-anchored assertions. If the downloaded PNG visibly does not match the node name (e.g. a frame called `Analyzer` renders as a Notes flyout), treat the mismatch as first-class signal:

1. Trust the screenshot, not the name. Write scenarios only from what the image shows.
2. Do **not** write assertions grounded in the misleading name. In the `Analyzer` example, do not add analyzer-specific scenarios anchored on that node; either find a differently-named node that genuinely renders the analyzer or defer the scenario to Known Limitations.
3. Add a Known Limitations entry naming the node and the mismatch, so downstream reviewers know the metadata inventory alone was insufficient for that node.

**Figma Slides branch.** For every Slides link catalogued in Step 1 (marked *awaiting Step 3 (screenshot)*), this is where the mandatory `get_screenshot` call runs. Unlike the design-file case above, the Slides branch is not gated on "a scenario needs visual anchoring" — Slides has no metadata inventory to fall back to, so the screenshot is the only Figma-derived context for the link. Use the recorded `fileKey` and `nodeId`, follow the same open-the-PNG + response-shape rules as the design-file case, and count the opened PNG against the Step 5 `get_screenshot` cap. Sources Summary uses the standard `✅ K opened PNGs (Slides — <node name>)` row defined in [`output-formats.md`](output-formats.md#sources-summary); no Known Limitations entry is required unless the response itself fails.

### Step 4 — Escape hatch: `get_design_context`

Reserve `get_design_context` for the rare case where a test scenario needs pixel-precise layout data or exact EUI component identifiers that neither the metadata nor the screenshot can supply — for example a regression test asserting on a specific `data-test-subj` selector that only appears in the Code Connect snippet.

When calling it:

- Explain in a preceding chat line **why** the metadata + screenshot combination was insufficient.
- Fetch a single specific node, never a container fan-out.
- Extract the identifiers needed and drop the raw response — do not retain the full React code in working context.

If the scenario can be written without those identifiers by referring to visible text, ARIA role, or component name, prefer that path and skip `get_design_context` entirely.

**Figma Make branch.** For every Make link catalogued in Step 1 (marked *awaiting Step 4 (design-context)*), this is where the `get_design_context` call runs. Use the recorded `fileKey = makeFileKey` and `nodeId = 0:1` — the single implicit Make root. Unlike the Design escape hatch above, the Make branch is not gated on "metadata + screenshot were insufficient" — Make files have neither. The response carries React + Tailwind reference code and (per Figma's tool documentation) any Code Connect mappings the file exposes.

Two things follow from Make's tool coverage:

- **No screenshot fallback.** `get_screenshot` supports Figma Design, FigJam, and Slides — not Make. If a scenario derived from a Make link needs visual, layout, or name-anchored verification (see Step 3 triggers above), that verification cannot be performed. Write the scenario from the code context if possible; otherwise defer it to Known Limitations. Do **not** attempt to work around the missing screenshot by asserting on Make node names alone — the *Name-vs-content mismatch* rule from Step 3 applies with no PNG available to catch it.
- **Known Limitations pairing.** Add a ⚠️ Known Limitations entry whenever the Make link produced scenarios that would normally require a screenshot, or when `get_design_context` itself fails / returns insufficient detail. The Sources Summary status alone is not enough — see [`output-formats.md`](output-formats.md#sources-summary) for the row template and the pairing requirement.

Every Make `get_design_context` call counts against the standard [Step 5](#step-5--session-budget) budget — a session with three Make links plus one Design escape-hatch fetch is already over the default cap of 2 and must follow the overage path defined there.

### Step 5 — Session budget

To keep the agent's context healthy across the rest of Step 1 (parent issue, sub-issues, PRs, code catalog), cap the **total Figma MCP calls per session** at:

| Tool | Default per-session cap | Rationale |
|---|---|---|
| `get_metadata` | 3 | 1 per Figma link on the target + 1 for the parent's link + 1 spare. Nested-container recursion is not counted here — it should not happen. |
| `get_screenshot` | 8 opened PNGs | Enough for the P0 flyout + a handful of P1 states + 1–2 error/empty states. The cap is on **opened PNGs** (the vision-token cost), not on `get_screenshot` calls that only returned a URL. |
| `get_design_context` | 2 | The escape hatch above. If a plan needs more than 2, the plan is probably asserting on the wrong things. Figma Make links whose `get_design_context` call runs in [Step 4](#step-4--escape-hatch-get_design_context) (per the [phase map](#when-each-sub-step-runs-phase-map)) also count against this cap — a plan with more than 2 Make links must follow the overage path below. |
| `get_figjam` | 1 per FigJam link | FigJam is background context. |

**These are hard caps by default** — the agent must not call a Figma MCP tool once its cap is reached. There is a single, explicit overage path so a legitimately large plan (very large multi-flyout epic, several linked Figma files) is not silently truncated:

1. **Before** the call that would exceed the cap, stop. Announce in chat: which cap would be exceeded, by how many calls, and which specific scenarios need the extra fetches — one bullet per scenario, with the node name.
2. **Ask the user for approval.** Do not proceed to the extra call until the user answers.
3. **If the user approves**, continue with the extra calls up to the number they authorised and record the outcome in the Sources Summary using the raised count — e.g. `✅ Metadata read + 10 opened PNGs for visual verification (cap raised from 8 by user)`. Do **not** add a Known Limitations entry for the approved overage — coverage is complete.
4. **If the user declines, or is not present to answer** (async run, dry-run, batch generation), stop calling immediately. The remaining behaviour depends on **which** tool's cap fired — a uniform "fall back to metadata-only reasoning" is only valid when the metadata itself is still available:

   | Cap that fired | Affected link type | Fallback for remaining scenarios | Canonical Sources Summary status |
   |---|---|---|---|
   | `get_screenshot` | Design-file link | Metadata for the affected link **was** already fetched in Figma Step 2, so scenarios can be verified from that metadata alone. Write them from named components without visual anchoring. | `⚠️ Screenshot budget reached (K PNGs opened — remaining scenarios verified from metadata only)` |
   | `get_screenshot` | **Slides** link (catalogued in Step 1, screenshot deferred to Step 3 per the [phase map](#when-each-sub-step-runs-phase-map)) | Slides has no metadata equivalent, so a Slides link whose mandatory screenshot never ran has **no** Figma-derived context at all. Mark the link as uninspected and derive scenarios only from non-Figma sources (issue text, PR diff). Do **not** guess structure from the URL or Slides deck name. | `⚠️ Screenshot budget reached (Slides link catalogued without screenshot; no Figma-derived context)` |
   | `get_metadata` | Design-file link only (FigJam / Slides / Make do not call `get_metadata`) | Metadata **cannot** be fallback material because the cap prevents building the inventory for the un-catalogued Design links. Mark those links as uninspected and derive scenarios only from non-Figma sources (issue text, PR diff, other Design links whose inventory was built before the cap fired). Do **not** guess structure from the URL or name. | `⚠️ get_metadata budget reached (3 fetched — remaining Figma links not inspected; scenarios derived from non-Figma sources)` |
   | `get_design_context` | Design-file link (*escape hatch* miss) | Metadata from Figma Step 2 is available for the link; any screenshot the scenario needed for visual anchoring had already been fetched or was independently deferred. Only the escape hatch could not run — affected scenarios degrade to the metadata (and any screenshot already gathered) instead of the pixel-precise identifiers `get_design_context` would have supplied. | `⚠️ get_design_context budget reached (2 fetched — remaining escape-hatch calls skipped; affected scenarios fall back to metadata and any screenshot already gathered)` |
   | `get_design_context` | **Make** link (where `get_design_context` is not an escape hatch but the only path) | There is no metadata or screenshot to fall back to — Make supports neither. Mark the Make link as uninspected and derive scenarios from non-Figma sources. | `⚠️ get_design_context budget reached (2 fetched — remaining Make links catalogued without design context)` |

   In every case, add a Known Limitations entry naming the specific scenarios that could not be verified against the design. This is the only branch that produces a `⚠️` for a budget hit — an approved overage is not a source gap. The canonical statuses above are defined once in [`output-formats.md`](output-formats.md#sources-summary); use those exact strings.

Never silently exceed a cap and never silently stop below one. The user must always see whether coverage was raised (approved overage) or degraded (declined / unavailable).

### Step 6 — Announce and propagate

- **Sources Summary.** One row per Figma link, describing what was fetched. Use one of the status cells from [`output-formats.md`](output-formats.md#sources-summary) — e.g. `✅ Metadata read (N fetchable elements catalogued)` or `✅ Metadata read + 3 opened PNGs for visual verification`. Here N counts the root itself (when it is fetchable) plus every fetchable descendant, per Step 2 above. When a screenshot was fetched **and the response returned a URL**, include that URL from `get_screenshot` in the status cell so the reader can open it — the URL is short-lived (Figma expires it after ~15 minutes), so treat it as a preview, not a stable reference. For **inline-base64 responses** (no shareable URL), use the node name/id as the reference in the status cell instead — do not fabricate a URL. This mirrors the URL vs. inline-base64 distinction in Step 3 above.
- **Known Limitations.** Only add a ⚠️ entry when coverage is genuinely incomplete:
  - The user narrowed a canvas via stop-and-ask (`section` / `canvas`), and specific children were excluded from the inventory.
  - The session budget cap fired mid-draft and remaining scenarios could not be verified against the design — visually (`get_screenshot` cap), structurally (`get_metadata` cap), or with reference-code precision (`get_design_context` cap), depending on which tool hit. Declined / user-unavailable branch of Step 5 only; approved overages are complete coverage and do **not** get a KL entry.
  - `get_metadata` returned an error (deleted / restructured node) or the file was inaccessible.
  - A scenario would have benefited from `get_design_context` but the escape hatch was intentionally skipped — record the missing precision so the automation writer knows.
  - **A screenshot revealed a name-vs-content mismatch** on a node (a frame whose layer name does not match what its PNG actually depicts — see Step 3, *Name-vs-content mismatch*). The Sources Summary row stays `✅` because the fetch itself worked, so without a KL entry the misleading metadata name would silently look authoritative. Name the node and the mismatch; the draft-coherence review's D6 check enforces this pairing (see [`draft-coherence-review.md`](draft-coherence-review.md#document-as-whole-coherence)).
  - **A Figma Make link produced scenarios that would normally require a screenshot** (layout / order / CTA assertions, or any name-anchored assertion — the Step 3 triggers). `get_screenshot` does not support Make, so those scenarios cannot be visually verified; name each affected scenario in the entry. See the *Figma Make branch* in [Step 4](#step-4--escape-hatch-get_design_context) for the underlying tool-coverage constraint.

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
3. For each **Figma link** found: apply the [Figma](#figma) flow above, running the sub-steps that belong to main **Step 1** — Figma **Step 1** (URL parse) and Figma **Step 2** (metadata inventory only), per the [phase map](#when-each-sub-step-runs-phase-map). Screenshots, `get_design_context`, and Sources Summary / Known Limitations propagation are deferred to main **Step 3** when scenarios are being drafted, so do **not** spend those budgets here. Parent epics often contain the most complete designs — treat as high-value context; that value is realised later, when scenarios that reference the parent's Figma layout are actually written.
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
