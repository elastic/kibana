---
name: security-pr-test-impact
description: >
  Use when someone gives an elastic/kibana pull request URL or number and asks what tests cover
  that change, whether the existing tests were updated, or where the test coverage gap is.
  Also use when someone names an `@elastic/<team>` and asks for the test impact of that team's
  PRs merged in the last week (or last N days). Read-only: fetches the PR with `gh`, runs a
  deterministic matcher against tests already in the repo, and prints one markdown report.
  Do not use to inspect test assertions, write test plans, review flaky/skipped tests, mine CI
  history, or post anything to GitHub.
disable-model-invocation: true
---

# PR test impact

For every production file a PR changes, answer three questions against tests already in the repo:

1. Does this PR add or update a test **linked** to that file?
2. Do tests already in the repo link to that file?
3. If yes, does this PR leave those tests unchanged (coverage gap on the new behavior)?

A **link** means a test sits in the right area. It does **not** mean the test's assertions cover the
new behavior. Every report carries that legend. Never relabel a link as coverage.

## Boundaries

- **Always:** fetch the PR with `gh` (`GH_PAGER=cat`), run the matcher script, print the report to stdout.
- **Always:** cite only test paths that appear in the script output (`citedTestPaths` in `--format json`).
  Discard any path you were tempted to add yourself.
- **Never:** comment on, label, or edit the PR; post the report anywhere on GitHub — unless the user
  explicitly says to publish it. The one sanctioned exception is the `/test-impact` comment command
  (`.github/workflows/security-pr-test-impact-comment.yml`): a Kibana member comments `/test-impact`
  on a PR and CI posts the `--compact` report as a single sticky comment (updated in place, never a
  second one). The agent itself still never posts.
- **Never:** read test plans, call other QA skills, inspect assertions, use CI history / skip tags /
  flaky-test signals, or add a product UI.
- **Never:** write the report under `docs/`. If saving, use the gitignored `.agents/tmp/` only
  (the script's `--out` refuses other locations).
- If the PR cannot be read, stop and say so. Do not guess the file list.

## Inputs

| Input | Example | Mode |
|---|---|---|
| PR URL or number | `https://github.com/elastic/kibana/pull/293171`, `#293171`, `293171` | single PR |
| Team + window | `@elastic/security-entity-analytics`, "last week" | team roll-up (default 7 days, cap 20 PRs) |

Only `elastic/kibana` PRs are accepted (the script rejects other repos).

## Workflow

```bash
SKILL="x-pack/solutions/security/plugins/security_solution/.agents/skills/security-pr-test-impact"
export GH_PAGER=cat
```

### 0. Decide where "existing tests" come from

The matcher reads existing tests from the **working tree** by default. If the local checkout is behind
`main` (common), read them from a fresh ref instead so recently merged tests are not missed:

```bash
git fetch --quiet https://github.com/elastic/kibana.git main:refs/pr-test-impact/upstream-main
REF="--ref refs/pr-test-impact/upstream-main"
```

Pass `$REF` to every script call below (omit it when the checkout is current). With `--ref`, CODEOWNERS
and `tsconfig.base.json` are read from that ref too. The report states which source was used.

### 1. Single PR

```bash
node "$SKILL/scripts/pr_test_impact.mjs" --pr <url|number> $REF
# optional: --format json (adds citedTestPaths, featureSummary, per-link via/inPr)
# optional: --out .agents/tmp/pr-test-impact-<number>.md
# optional: --compact (PR-comment size: UPDATED rows collapsed, feature-path lists summarised,
#           boundary list and Checks omitted, hidden sticky-comment marker prepended)
```

`--compact` is what the `/test-impact` CI workflow posts. Use the full report when working with the
user; the compact one exists only to stay under GitHub's 65,536-character comment limit.

### 2. Team, last 7 days

```bash
node "$SKILL/scripts/pr_test_impact.mjs" --team @elastic/<team> --days 7 --max-prs 20 $REF
# optional: --out .agents/tmp/pr-test-impact-team-<slug>.md
```

The script resolves the team's path prefixes from `.github/CODEOWNERS`, lists merged PRs into `main`
in the window that touch those prefixes, analyzes the 20 most recent, and states in **Scope** when
the cap was hit. Rows are sorted so **NO EXISTING TEST** comes first. A PR that cannot be read is
listed under **Scope** as unreadable (its files are never guessed); the run only fails when no PR
could be read. Expect roughly a minute: the merged-PR listing fetches file lists for every PR in the
window.

### 3. Finish the report

The script prints sections 1–4 (Scope, Legend, Summary, Production files) complete. Section 5
(**Checks**) is emitted only when there are NO EXISTING TEST rows, as a placeholder list:

- Replace the placeholder with **at most five** checks for the whole report, taken from the changed
  behavior in the diff of the uncovered files (new route, new control, new privilege, changed
  default). Read the relevant hunks from `gh pr diff <number>` or the `patch` field in `--format json`.
- One line each: what to exercise and what to observe. Not a manual test plan; do not derive checks
  from nearby tests.
- Delete the `<!-- agent: … -->` comment. If there are no uncovered rows, there is no Checks section.

Then print the whole report to the user. Keep the Legend sentence verbatim, even when every row is
candidate coverage.

### 4. Sanity pass (do not skip)

- Every test path you mention appears in the script output. The markdown shortens paths for display
  (the root is stated in Scope; colocated tests show the file name only; feature-path specs are
  relative to their anchor dir). When you need a full path, take it from `--format json`.
- Verdict names are exactly: `CANDIDATE COVERAGE — UPDATED`, `CANDIDATE COVERAGE — NOT UPDATED`,
  `NO EXISTING TEST`.
- A `feature-path` link is the weakest link; its type is printed so readers can discount it. Do not
  summarize feature-path-only rows as "covered".
- If a NO EXISTING TEST row looks wrong (you know a suite exists), do not add it by hand. Report the
  row as the script produced it and note the suspected miss separately, with the path, so the
  matcher rules can be improved via PR to this skill.

## Link rules (summary)

Implemented in `scripts/lib/matcher.mjs`; details in [references/link-rules.md](references/link-rules.md).

| Link type | Means | Strength |
|---|---|---|
| `import` | a Jest/FTR/Scout test file imports or requires the changed file (relative or `@kbn/*`) | strong |
| `colocated` | a `*.test.ts(x)` sits next to the changed file (`same name` is stronger than `same directory`) | strong / medium |
| `feature-path` | a Cypress / Scout / FTR spec lives under a directory that mirrors the changed feature path | weak |

CODEOWNERS is only the **search boundary** (owning teams' prefixes + the conventional Security test
roots). Same-team ownership is never a link. No `describe`/`it` name matching.

## Change type

One coarse type per production file with the reason that produced it: `privilege`,
`saved-object migration`, `route`, `feature flag`, `UI`, `API`, or `copy`. It says what kind of
change the file carries so a reader can prioritise review; it is not a severity score. Copy-only
changes (i18n / `translations.ts`) and privilege changes never share a bucket. Heuristics live in
`scripts/lib/classify.mjs`.

## Files

- `scripts/pr_test_impact.mjs` — CLI (`--pr`, `--team`, `--files` for offline fixtures, `--compact`)
- `scripts/lib/matcher.mjs` — link matching, verdicts, file source (working tree or `--ref`)
- `scripts/lib/classify.mjs` — production/test/ignored classification and change type
- `scripts/lib/codeowners.mjs` — CODEOWNERS parsing (last match wins) and team prefixes
- `scripts/lib/github.mjs` — read-only `gh` wrappers
- `scripts/lib/report.mjs` — markdown rendering
- `scripts/feature_path_aliases.json` — feature-path aliases and generic segments to ignore
- `scripts/matcher.test.mjs` — `node --test` suite (import, colocated, feature-path, same-team-not-a-link, verdicts, `--ref`)
- `references/link-rules.md`, `references/report-template.md`
- `.github/workflows/security-pr-test-impact-comment.yml` (repo root) — `/test-impact` comment command;
  runs the script from `main` with `--compact` and posts one sticky comment, full report as artifact

Run the tests with `node --test "$SKILL/scripts/matcher.test.mjs"`.
