---
name: team-auto-tests-stats
description: >
  Produces a markdown team report under `.agents/tmp/` (gitignored): **Ownership** (CODEOWNERS prefixes with tests
  only), **Test Cases** (Scout Playwright `--list`), FTR/Cypress/Scout rows, **Skipped**, **Execution phase**
  (Buildkite links), optional **Coverage** per `*.spec.ts`. Do not write `docs/team-automation-*.md`. Use for
  `@elastic/` automation inventory and CI phase mapping.
---

# Elastic team testing / automation inventory

## Terminology (Tests table)

- **Test suite:** a `describe` / `apiTest.describe` / `spaceTest.describe` block (skipped suite ⇒ `describe.skip` / `apiTest.describe.skip` / `spaceTest.describe.skip` applies to everything nested under it except hooks below).
- **TC (test case):** a leaf **`apiTest('…',`** / **`spaceTest('…',`** or **`test('…',`** invocation inside a suite. **Exclude hooks:** `*.beforeAll`, `*.beforeEach`, `*.afterAll`, `*.afterEach`.
- **`Test Cases` column:** total logical Scout specs from `--list` (see §2) or analogous counts for Cypress/FTR heuristics.

## Scope

- **Location:** `security_solution/.agents/skills`; workflow is **repo-wide** (`.github/CODEOWNERS`, `.buildkite/`).
- **Multi-owner paths:** Each team gets full credit for every CODEOWNERS line that lists it (totals across teams are not additive).
- **Skips:** Static markers in source only — not CI Stats / GitHub `skipped-test` volume. Cypress tag skips (`@skipInServerless`, …) are out of band unless the user asks.

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
| Multi-team aggregate (optional) | `.agents/tmp/team-automation-inventory-7-teams.md` |

**Path name:** the directory is **`.agents/tmp`** (plural **`agents`**), not `.agent/tmp`.

**Do not** put Playwright `--list` JSON or other scratch artifacts in **`.agents/tmp/`** — use **`/tmp/`** (or `$TMPDIR`), then delete after counts are recorded.

Create **`.agents/tmp/`** if needed. **Never commit** these outputs.

### Link paths

Reports live under **`.agents/tmp/<file>.md`** (two levels below repo root). Every repo-target link uses **`../../`** then `x-pack/`, `.buildkite/`, etc.

**Coverage extractor** ([`extract_scout_api_coverage_md.mjs`](scripts/extract_scout_api_coverage_md.mjs)): second argument = link prefix such as **`../../x-pack/.../tests/`** (trailing slash).

## Workflow checklist

- [ ] **Output:** **`.agents/tmp/team-automation-<slug>.md`** only — **`../../`** on every link; no `docs/` copy
- [ ] **Ownership** (§1): test-relevant CODEOWNERS prefixes only
- [ ] Scout configs under those prefixes
- [ ] Per config: `npx playwright test --list --reporter=json` → unique spec count ([scripts/count_playwright_list_unique_specs.mjs](scripts/count_playwright_list_unique_specs.mjs))
- [ ] Cypress `*.cy.ts(x)` — **Test Cases** heuristic + skips (mirror §§2–3)
- [ ] Table **Tests**: always **FTR**, **Cypress**, **Scout** in that order; each row filled per §§2–4 (**Completeness rule** — no placeholder **0** without searching owned trees)
- [ ] **Execution phase** table from `.buildkite/` — use **`../../.buildkite/...`** markdown links (comma-separated when several apply); literal **`-`** when `No`
- [ ] **Coverage and descriptions** (Scout API or UI): run [scripts/extract_scout_api_coverage_md.mjs](scripts/extract_scout_api_coverage_md.mjs) with link prefix **`../../x-pack/.../tests/`** (or the correct relative path for that tree). Paste after **Execution phase**
- [ ] **Done:** report exists only under **`.agents/tmp/`** — no copies under `docs/`

### 1) Ownership — CODEOWNERS (prefixes with tests only)

The **Ownership** table lists CODEOWNERS paths **only when that path’s subtree contains automated test source** (Scout / Cypress / FTR-style trees, Jest `*.test.ts`, etc.). Full product ownership stays in `.github/CODEOWNERS`.

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/team-auto-tests-stats/scripts/list_owned_paths_for_team.sh @elastic/<slug> \
  | node x-pack/solutions/security/plugins/security_solution/.agents/skills/team-auto-tests-stats/scripts/filter_codeowners_paths_with_tests.mjs
```

**Helpers:** [scripts/list_owned_paths_for_team.sh](scripts/list_owned_paths_for_team.sh), [scripts/filter_codeowners_paths_with_tests.mjs](scripts/filter_codeowners_paths_with_tests.mjs)

Reference (not for the table): `rg -n '@elastic/<slug>\b' .github/CODEOWNERS`

### 2) Scout (Playwright)

Configs: `**/test/scout/**/playwright.config.ts`, `parallel.playwright.config.ts`, `scout_cspm_agentless` when owned.

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
| Test cases | `it(`, `context(`, `specify(` counts under ownership |
| describe-level skips | `describe.skip`, nested describe skip patterns |
| test-level skips | `it.skip`, `xit`, … |

### 4) FTR-oriented / integration-style

Trees: `test/functional`, `test/api_integration`, `test/serverless/**`, `test/security_solution_api_integration/**`, etc. Same `it` / `context` / `specify` heuristics; skip levels mirror Cypress rules.

The deliverable **Tests** table **always lists FTR**. If legacy suites remain on disk but the team relies on Scout only, still show **`-`** Test type with **0** **Test Cases** (unless owned FTR-style files are counted — then fill type / **Test Cases** / **Skipped** honestly).

### 5) Where tests run — Table B

| Phase | Source hints |
|-------|---------------|
| PR CI | [.buildkite/pipelines/pull_request/base.yml](../../../../../../../../.buildkite/pipelines/pull_request/base.yml) (`build_scout_tests`), [.buildkite/scripts/pipelines/pull_request/pipeline.ts](../../../../../../../../.buildkite/scripts/pipelines/pull_request/pipeline.ts), [.buildkite/scout_ci_config.yml](../../../../../../../../.buildkite/scout_ci_config.yml) |
| Post-merge | [.buildkite/pipelines/on_merge.yml](../../../../../../../../.buildkite/pipelines/on_merge.yml) (`build_scout_tests`) |
| Quality gates | `.buildkite/pipelines/quality-gates/`, `.buildkite/pipelines/security_solution_quality_gate/` |
| Periodic | MKI periodic groups under `.buildkite/pipelines/security_solution_quality_gate/` |

**Deliverable (Execution phase):**

- Title section: **`## Execution phase`**
- First column header: **Execution phase**
- Column **Executes tests:** `Yes` / `No`
- Column **Pipeline / config:** **`../../.buildkite/...`** markdown links (comma-separated when several apply); literal **`-`** when `No`

### 6) Markdown shape (`.agents/tmp/team-automation-<slug>.md`)

Minimal output — all links use **`../../`** from repo root.

```markdown
# Test automation inventory — @elastic/<slug>

**Generated:** YYYY-MM-DD

## Ownership (CODEOWNERS)

_Test-relevant paths only (subtree contains Scout, Cypress, FTR-style, or Jest test files)._

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

Rows **in fixed order**: **FTR**, **Cypress**, **Scout**. **`Skipped`** cell: **`N Suites (M TCs)`** line, then **`- [file](../../…) - K TC`** per skipped-suite source file (ASCII hyphen).

**Coverage and descriptions:** `node scripts/extract_scout_api_coverage_md.mjs <scout-tests-dir> ../../x-pack/.../tests/` (prefix must match **`.agents/tmp/`** link depth).

**Do not** include: disclaimer blocks, methodology section, helper-only audit logs, Notes column clutter, “commands used” appendix. **Do not** add copies of this report under `docs/`.

## Out of scope

- CI Stats / GitHub flaky issue mining.
- Repo-wide Jest unit inventory unless explicitly requested later.
