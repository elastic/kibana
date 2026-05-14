---
name: team-auto-tests-stats
description: >
  Use when someone needs an `@elastic/<team>` automation and test inventory tied to CODEOWNERS,
  Buildkite execution phases, and per-framework counts/skips for FTR, Cypress, and Scout
  (including Playwright `--list`). Typical asks: team automation stats, where Security Solution
  tests run in CI, Scout vs Cypress coverage by ownership; per-team or multi-team `@elastic/`
  visibility; auditing completeness of the three framework rows; Security Solution Scout `parallel_tests/`
  paths via scripts/team_inventory_path_overrides.json (stats-only, not CODEOWNERS). Deliver markdown only under
  gitignored `.agents/tmp/`, never `docs/`. Do not use for CI Stats volume, flaky-test mining,
  GitHub skipped-test triage, or Jest unit tests — those are out of scope for this skill.
---

# Elastic team testing / automation inventory

## Overview

Structured inventory: **ownership paths that contain FTR-, Cypress-, or Scout-style test source** (not Jest units), a fixed **FTR / Cypress / Scout** table (counts + skips), **where tests run** (Buildkite plus Elastic Cloud / Appex QA where relevant), and optional **Scout coverage** rows.

YAML **`description`** carries **when / when-not triggers** for discovery. **Procedure** lives in the workflow checklist and §§1–6 below — read those sections to execute; **do not** infer operational steps from the YAML alone.

## Terminology (Tests table)

- **Test suite:** a `describe` / `apiTest.describe` / `spaceTest.describe` block (skipped suite ⇒ `describe.skip` / `apiTest.describe.skip` / `spaceTest.describe.skip` applies to everything nested under it except hooks below).
- **TC (test case):** a leaf **`apiTest('…',`** / **`spaceTest('…',`** or **`test('…',`** invocation inside a suite. **Exclude hooks:** `*.beforeAll`, `*.beforeEach`, `*.afterAll`, `*.afterEach`.
- **`Test Cases` column:** Scout — sum of `--list` unique-spec integers across owned configs (§2); Cypress/FTR — analogous leaf-marker heuristics (§§3–4).

## Scope

- **Location:** `security_solution/.agents/skills`; workflow is **repo-wide** (`.github/CODEOWNERS`, `.buildkite/`).
- **Multi-owner paths:** Each team gets full credit for every CODEOWNERS line that lists it (totals across teams are not additive).
- **Inventory-only overrides:** Paths in [`scripts/team_inventory_path_overrides.json`](scripts/team_inventory_path_overrides.json) extend **`list_owned_paths_for_team.sh`** beyond `.github/CODEOWNERS` (e.g. Security Solution **`parallel_tests/`** subtree by feature team). Stats-only — **does not** change GitHub reviewers. Edit the JSON when new folders need team-level attribution.
- **Skips:** Static markers in source (e.g. `describe.skip`) plus **Cypress conditional tag skips** (see §3). Exclude CI Stats / GitHub `skipped-test` volume — those are not grepped from sources.

## Completeness rule (Tests table)

The **Tests** table must **always** include three rows, in order: **FTR**, **Cypress**, **Scout**.

- **`Test Cases: 0`** and **`Skipped: -`** are valid **only after** you have applied §§2–4 (search owned trees for that framework’s sources). They mean *no tests of that kind under this team’s test-relevant ownership*, not *not yet counted*.
- **`Test type`** column: use **`-`** when **`Test Cases`** is **0**; otherwise name the primary bucket (e.g. **API integration**, **UI**, **API / UI**).
- Do **not** hand off a team inventory with placeholder zeros where FTR or Cypress cases exist under owned paths (common mistake: Scout filled in, FTR left at **0** because API integration tests were not grepped).

## Inputs

- Accept `@elastic/foo` or `foo`. Display **`@elastic/foo`**. Use the same **`<slug>`** (kebab-case; no `@elastic/` in filename) in output filenames below.

## Output location (`.agents/tmp/` only)

**All markdown from this skill** is written under **`.agents/tmp/`** at the Kibana repo root (gitignored). **Do not** add `docs/team-automation-*.md` or any committed path for these reports.

| Output | Path |
|--------|------|
| Per-team report | `.agents/tmp/team-automation-<slug>.md` |
| Multi-team aggregate (optional) | `.agents/tmp/team-automation-inventory-<n>-teams.md` (example name; pick `<n>` to match teams covered) |

**Path name:** the directory is **`.agents/tmp`** (plural **`agents`**), not `.agent/tmp`.

**Do not** put Playwright `--list` JSON or other scratch artifacts in **`.agents/tmp/`** — use **`/tmp/`** (or `$TMPDIR`), then delete after counts are recorded.

Create **`.agents/tmp/`** if needed. **Never commit** these outputs.

### Link paths

Reports live under **`.agents/tmp/<file>.md`** (two levels below repo root). Every repo-target link uses **`../../`** then `x-pack/`, `.buildkite/`, etc.

**Coverage extractor** ([`extract_scout_api_coverage_md.mjs`](scripts/extract_scout_api_coverage_md.mjs)): second argument = link prefix such as **`../../x-pack/.../tests/`** (trailing slash).

## Workflow checklist

Navigation only — details are in the referenced sections.

- [ ] Output path, link prefix **`../../`**, no **`docs/`** copy (**§6**)
- [ ] Ownership — test-relevant paths from CODEOWNERS + **`team_inventory_path_overrides.json`** (**§1**)
- [ ] Scout — configs, **`--list`**, sum rule, skips, Security Solution shared-config caveat (**§2**)
- [ ] Cypress — counts & skips (**§3**)
- [ ] FTR — counts & skips (**§4**)
- [ ] **Completeness rule** — table rows **FTR**, **Cypress**, **Scout** in order; no placeholder zeros
- [ ] **Execution phase** — `.buildkite/` links plus Elastic Cloud / Appex QA note (**§5**)
- [ ] **Coverage and descriptions** — **`extract_scout_api_coverage_md.mjs`** (**§6**)

### 1) Ownership — CODEOWNERS + inventory overrides (prefixes with tests only)

The **Ownership** table lists paths **only when** that prefix’s subtree contains Scout, Cypress, or FTR-style automated test source (for example `**/test/scout/**`, `*.cy.ts`, `test/api_integration/**`, `test/security_solution_api_integration/**`). **Prefixes** come from **`list_owned_paths_for_team.sh`**, which merges `.github/CODEOWNERS` with **[`team_inventory_path_overrides.json`](scripts/team_inventory_path_overrides.json)** (stats-only attribution; overrides do **not** replace or mirror GitHub ownership). **Jest unit files** (`*.test.ts` / `*.test.tsx` next to source) **do not** qualify a path for this table and **must not** appear in the report narrative as test inventory.

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/team-auto-tests-stats/scripts/list_owned_paths_for_team.sh @elastic/<slug> \
  | node x-pack/solutions/security/plugins/security_solution/.agents/skills/team-auto-tests-stats/scripts/filter_codeowners_paths_with_tests.mjs
```

**Helpers:** [scripts/list_owned_paths_for_team.sh](scripts/list_owned_paths_for_team.sh), [scripts/merge_team_inventory_path_overrides.mjs](scripts/merge_team_inventory_path_overrides.mjs), [scripts/team_inventory_path_overrides.json](scripts/team_inventory_path_overrides.json), [scripts/filter_codeowners_paths_with_tests.mjs](scripts/filter_codeowners_paths_with_tests.mjs)

Reference (not for the table): `rg -n '@elastic/<slug>\b' .github/CODEOWNERS`

### 2) Scout (Playwright)

Configs: `**/test/scout/**/playwright.config.ts`, `parallel.playwright.config.ts`, `scout_cspm_agentless` when owned.

**Security Solution — shared Playwright config:** Feature-team Scout specs often sit under **one** shared Playwright config co-owned by **`@elastic/sec-eng-prod`** and **`@elastic/appex-qa`** (not per-feature-team CODEOWNERS). Until per-team config splits land, **`--list` scoped only to “configs owned by this team” can yield 0** even when the team has many Scout tests. **Interim:** attribute Scout **`Test Cases`** / skips to specs under that team’s **subtree within the shared Scout test tree** (by path / folder convention), not solely by config CODEOWNERS. Do **not** treat Scout **0** as valid if owned specs exist under that subtree (**Completeness rule**).

Per config directory (from repo root, `REPO_ROOT="$(git rev-parse --show-toplevel)"`). **Do not** put JSON under `.agents/tmp/` — use **`/tmp/`** (or `$TMPDIR`):

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
TMP_JSON="/tmp/team-auto-tests-stats-<slug>-pw-list-<config-id>.json"
cd <directory-containing-playwright.config.ts>
npx playwright test --list --reporter=json > "$TMP_JSON"
node "$REPO_ROOT/x-pack/solutions/security/plugins/security_solution/.agents/skills/team-auto-tests-stats/scripts/count_playwright_list_unique_specs.mjs" "$TMP_JSON"
rm -f "$TMP_JSON"
```

**Test Cases:** use the script’s integer — unique specs keyed by `file:line:title` walking `suites` → nested `suites` → `specs[]`. **Do not** approximate Scout totals by counting `test(` / `apiTest(` in source; Scout **projects** (e.g. `local`, `ech`, `mki`) invalidate that heuristic.

**Scout row (`Test Cases`) with multiple configs:** **Sum** the script integer from **each** owned Scout config directory after running the §2 bash block once per directory. **Ambiguity (not specified here):** whether to dedupe specs that might appear in more than one config/project — **do not guess**; if overlap is plausible, add a one-line caveat next to the Scout row.

Scout **Skipped** inventory follows §2 only (suite/test `.skip` patterns). **Do not** apply Cypress **`@skipIn…`** tag rules to the Scout row.

Bootstrap: match root **`engines.node`**, run **`yarn kbn bootstrap`** if `@kbn/*` resolution fails during `--list`.

**Skipped column (format):** Do **not** repeat the column name. Use **`<br>`** for line breaks.

1. First line: **`N Suites (M TCs)`** where **`N`** = count of skipped **`apiTest.describe.skip` / `spaceTest.describe.skip` / `describe.skip`** suite roots, **`M`** = sum of **TC** inside those skipped suites only.
2. Then one bullet per skipped-suite file: **`- [basename](../../path/to/file) - K TC`** (`K` = TC count in that file’s skipped suite).
3. Individual **`test.skip` / `apiTest.skip` / `spaceTest.skip`** (not whole suite): still use per-file **`- [basename](../../path) - K TC`**; add a short label if needed (e.g. `test-level skips`).
4. Cell **`-`** when no skips.

Compare with [.buildkite/scout_ci_config.yml](../../../../../../../../.buildkite/scout_ci_config.yml) `excluded_configs` only when CI vs local counts disagree.

Paths: `.../test/scout/api/...` → **API**; `.../test/scout/ui/...` → **UI**.

References: `docs/extend/scout/skip-tests.md`.

### 3) Cypress

| Metric | Heuristic |
|--------|-----------|
| Test cases | **`it(`** and **`specify(`** counts under ownership (leaf tests only). **`context(`** is an alias for **`describe`**-style grouping — **do not** count **`context(`** toward **Test Cases**; use it only when identifying **suites** / skips / tags below. |
| describe-level static skips | `describe.skip`, `context.skip`, nested describe skip patterns |
| test-level static skips | `it.skip`, `xit`, `xcontext`, … |
| Suite-level **tag** skips | Any `describe(` or `context(` **not** using `.skip`, whose options include `tags: [...]` with at least one string matching **`@skipIn`** (Security Solution convention: `@skipInServerless`, `@skipInServerlessMKI`, `@skipInServerlessQA`, … — grep owned specs for `'@skipIn` to discover current tags). Count **suite roots** separately from static skips; **K TC** = sum of `it(` / `specify(` leaves under that suite only. |
| Test-level **tag** skips | Any `it(` / `specify(` whose options include `tags` with **`@skipIn…`**, and **no** ancestor `describe` / `context` (up to the file’s top level) already has suite `tags` containing **`@skipIn…`** — otherwise those TCs are already counted under suite-level tag skips. Attribute bullets to the **file**. |

**`Skipped` column (Cypress):** Use **`<br>`** for line breaks. **Combine** static skips and **@skipIn…** tag skips into **one** inventory (do not split into two sub-headings).

1. **Opening line:** **`N Suites (M TCs)`** (optionally bold) where **`N`** = all counted suite roots / groupings: static **`describe.skip` / `context.skip`** (plus isolated static **`it.skip`** / `xit` bullets if needed) **plus** tag-conditioned suite roots and test-level tag items from the rules in the table above — **without double-counting** when the same suite is both static and tag (static wins; see below). **`M`** = sum of **`K TC`** across all bullets.
2. **Single bullet list:** **`- [basename](../../path) - K TC`** with a suffix so readers see the mechanism: **`(static)`** for describe/context (or file-level) static skips, **`(tags: …)`** / **`(tags: …; suite: …)`** for **@skipIn…** suite skips, **`(test-level tags: …)`** for tag-only **`it`** skips when applicable.
3. When the **same** suite is both `describe.skip` and tag-conditioned, **one bullet only**, counted under **static** — **`(static)`** — do not also list it under tag skips.
4. Use **`-`** for the whole **Skipped** cell only when there are no static and no tag skips.

Reference: Cypress runner / config excludes tags per environment; inventory records **source** intent, not a specific CI job outcome.

### 4) FTR-oriented / integration-style

Trees: `test/functional`, `test/api_integration`, `test/serverless/**`, `test/security_solution_api_integration/**`, etc. Count **leaf** tests with **`it(`** / **`specify(`** where those APIs appear (mirror Cypress §3 — **`context(`** groups suites, not TCs). **Other** FTR/Mocha patterns may exist — **flag** in the report if counts look inconsistent rather than inventing new heuristics here.

**FTR row vs Jest units:** This row is for **FTR-style / integration paths** above only. **Jest unit** files (`*.test.ts` / `*.test.tsx`) are **never** counted in the **Tests** table (**Out of scope**).

**Skipped:** static markers only (`describe.skip`, `it.skip`, …). FTR-style suites do **not** use Cypress `@skipIn…` tags — no `(tags: …)` bullets on the FTR row.

The deliverable **Tests** table **always lists FTR**. If legacy suites remain on disk but the team relies on Scout only, still show **`-`** Test type with **0** **Test Cases** (unless owned FTR-style files are counted — then fill type / **Test Cases** / **Skipped** honestly).

### 5) Where tests run — Table B

| Phase | Source hints |
|-------|---------------|
| PR CI | [.buildkite/pipelines/pull_request/base.yml](../../../../../../../../.buildkite/pipelines/pull_request/base.yml) (`build_scout_tests`), [.buildkite/scripts/pipelines/pull_request/pipeline.ts](../../../../../../../../.buildkite/scripts/pipelines/pull_request/pipeline.ts), [.buildkite/scout_ci_config.yml](../../../../../../../../.buildkite/scout_ci_config.yml) |
| Post-merge | [.buildkite/pipelines/on_merge.yml](../../../../../../../../.buildkite/pipelines/on_merge.yml) (`build_scout_tests`) |
| Quality gates | `.buildkite/pipelines/quality-gates/`, `.buildkite/pipelines/security_solution_quality_gate/` |
| Periodic | MKI periodic groups under `.buildkite/pipelines/security_solution_quality_gate/` |
| Elastic Cloud / Appex QA | Scout (and related automation) may also run on Elastic Cloud pipelines documented for troubleshooting — see [Elastic Cloud pipelines](https://docs.elastic.dev/appex-qa/troubleshooting-cloud-failures#elastic-cloud-pipelines) (external). Supplements `.buildkite/` sources above. |

**Deliverable (Execution phase):**

- Title section: **`## Execution phase`**
- First column header: **Execution phase**
- Column **Executes tests:** `Yes` / `No`
- Column **Pipeline / config:** **`../../.buildkite/...`** markdown links for in-repo configs (comma-separated when several apply); literal **`-`** when `No`. When Scout runs on Elastic Cloud / Appex QA only, cite that with the **external** link above (full URL in the generated report is OK — it is not under `.agents/tmp/../../`).

### 6) Markdown shape (`.agents/tmp/team-automation-<slug>.md`)

Minimal output — repo-target links in the report use **`../../`** **from the report file** (under `.agents/tmp/`), not from the repo root.

```markdown
# Test automation inventory — @elastic/<slug>

**Generated:** YYYY-MM-DD

## Ownership (CODEOWNERS)

_Test-relevant paths only (subtree contains Scout, Cypress, or FTR-style test source — not Jest unit files)._

| Area | Path |
|------|------|
| Platform | [label](../../x-pack/platform/…)<br>[label](../../x-pack/platform/…)<br>… |
| security_solution | [label](../../x-pack/solutions/security/…)<br>… |

## Tests

| Framework | Test type | Test Cases | Skipped |
|-----------|-----------|------------:|---------|
| … | … | … | … |

## Execution phase

| Execution phase | Executes tests | Pipeline / config |
|-----------------|----------------|-------------------|

## Coverage and descriptions

| File name | Suite description | Test case descriptions |
|-----------|-------------------|------------------------|
(row per `*.spec.ts`; TC titles joined with `<br>` in third column — regenerate via `extract_scout_api_coverage_md.mjs`)
```

Rows **in fixed order**: **FTR**, **Cypress**, **Scout**. **`Skipped`** cell: **`N Suites (M TCs)`** plus per-file bullets; **Cypress** includes **@skipIn…** entries in the **same** list as static skips, per §3 (suffixes **`(static)`** vs **`(tags: …)`**; ASCII hyphen in bullets).

**Coverage and descriptions** (run from any cwd; use repo root):

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
node "$REPO_ROOT/x-pack/solutions/security/plugins/security_solution/.agents/skills/team-auto-tests-stats/scripts/extract_scout_api_coverage_md.mjs" \
  <scout-tests-dir> ../../x-pack/.../tests/
```

Second argument = link prefix for markdown paths (**must** match **`.agents/tmp/`** depth, trailing slash as needed).

**Do not** include: disclaimer blocks, methodology section, helper-only audit logs, Notes column clutter, “commands used” appendix. **Do not** add copies of this report under `docs/`.

## Common mistakes

- **Placeholder zeros:** Scout filled in, **FTR** or **Cypress** left at **0** without grepping owned trees (see **Completeness rule**).
- **`../../` in wrong context:** Links are relative to **`.agents/tmp/<report>.md`**, not the skill file path.

## Out of scope

- CI Stats / GitHub flaky issue mining.
- **Jest unit tests** (`*.test.ts` / `*.test.tsx` and similar): not listed under **Ownership**, not counted in **Test Cases**, and no Jest skip inventory — this skill only covers the **FTR / Cypress / Scout** frameworks above.
