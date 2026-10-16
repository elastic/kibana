<!-- Authoritative reference for the security-pr-test-impact skill. Section order is fixed. The script
     (scripts/lib/report.mjs) renders sections 1–4 and a Checks placeholder; the agent only fills
     Checks. Never add sections, never rename verdicts, never drop the Legend. -->

# Report template

Output: one markdown document on stdout. Optional copy only under `.agents/tmp/` (never `docs/`).

## Single PR

```markdown
# PR test impact — [#<n>](<url>) <title>

## Scope

- PR: [#<n>](<url>) (<state>, merged <date>)
- Owning team(s): `@elastic/<team>`[, …]            ← resolved from CODEOWNERS for the production files
- Files in diff: <p> production (one table row each), <t> test (used to decide UPDATED), <i> not analyzed (generated / config / docs; listed below)
- Existing tests read from: `working tree` | `<git ref>`
- Search boundary: CODEOWNERS prefixes of the owning team(s) + conventional Security test roots
  (<n> candidate test files scanned; <m> owned prefixes without test files omitted). Prefixes are listed below.
[- Paths below are relative to `<common root>/`; paths outside it are shown in full. Tests colocated
  with a production file are shown by file name only.]   ← when rows share a root of ≥2 segments

<details>
<summary>Search boundary prefixes (<k> with candidate tests)</summary>

- `<prefix>` (<candidate count>)
- …

</details>

<details>                                              ← only when some PR test file links to no row
<summary>Test files in this PR not linked to any production file (<u> of <t>)</summary>

- `<test path>` (<framework>, <status>)              ← typically mocks / fixtures / index files
</details>

<details>                                              ← only when <i> > 0; also in --compact
<summary>Files not analyzed (<i>)</summary>

- `<path>` — <reason>                                 ← generated code / documentation / image /
                                                        config / tooling file / lockfile / Jest snapshot
</details>
[- **No production files in this diff.** Test files changed: (list)]   ← test-only PRs

## Legend

A link means a test sits in the right area (import, colocated, or feature-path); it does not mean
the test’s assertions cover the new behavior.

How tests are linked (strongest first):
- **imports it** — the test file imports the changed file, so it really loads that code. "same name" = the dedicated unit test next to it; "same folder" = another test in the same directory.
- **same name, next to it** / **same folder only** — the test sits beside the changed file but does not import it; it may not exercise the change at all.
- **similar path** — an e2e / API spec lives under a directory whose name mirrors the feature. Weakest signal: a path match, nothing more.

## Summary

| Verdict | Files |
|---|---:|
| NO EXISTING TEST | <n> |
| CANDIDATE COVERAGE — NOT UPDATED | <n> |
| CANDIDATE COVERAGE — UPDATED | <n> |

## Production files

| Production file | Change type | Verdict | Linked tests (how linked) | Linked tests updated by this PR |
|---|---|---|---|---|
| `<path>` [_(added|removed|renamed)_] | **<type>** _(also: …)_<br><reason> | **<verdict>** | imports it, same name: `<file name>` _(in this PR: modified)_<br>imports it: `<test>`<br>same folder only: `<file name>`<br>…up to 4 visible…<br><details><summary>+N more tests that import it or sit beside it[, t touched by this PR]</summary>…</details><br><details><summary>similar path (`<tokens>` → `<anchor dir>`, N specs, showing K[; t touched by this PR])</summary>&nbsp;&nbsp;`<spec relative to anchor dir>`…</details> | Yes (k of n) / No / — |

## Checks            ← only when there is at least one NO EXISTING TEST row

_At most five checks for the whole report, derived from the changed behavior in the diff of the
NO EXISTING TEST rows (new route, new control, new privilege). Not a manual test plan._

- `<uncovered file>` — <change type>: <one line: what to exercise, what to observe>
- … (≤ 5 total)
```

Rows are sorted NO EXISTING TEST → NOT UPDATED → UPDATED, then by path. In the linked-tests cell,
direct links (import / colocated) are ordered PR-touched first, then same-name colocated, then
imports, then same-directory, then by path; the first four are visible and the rest sit in a collapsible
`<details>` block. Each feature-path group is its own collapsible block whose summary carries the
counts and how many specs this PR touched. Nothing is dropped from the markdown; collapsing is
presentation only.

Link labels in the markdown are plain language; the JSON keeps the technical `types` / `via`:

| JSON `types` + `via` | Markdown label |
|---|---|
| `import` + `colocated` (`same name`) | `imports it, same name` |
| `import` + `colocated` (`same directory`) | `imports it, same folder` |
| `import` | `imports it` |
| `colocated` (`same name`) | `same name, next to it` |
| `colocated` (`same directory`) | `same folder only` |
| `feature-path` | `similar path (…)` group |

## Compact mode (`--compact`)

Used by the `/test-impact` PR-comment workflow so the report fits GitHub's 65,536-character comment
limit. Same title, Scope, Legend and Summary, with these differences:

- A hidden `<!-- security-pr-test-impact -->` marker is the first line (the workflow finds and
  updates its own sticky comment through it).
- **Scope** omits the collapsed boundary-prefix list.
- **Production files**: NO EXISTING TEST and NOT UPDATED rows are visible as usual; all UPDATED
  rows sit in one `<details>` block (`<n> file(s) — CANDIDATE COVERAGE — UPDATED`). Inside that
  block feature-path groups are summary-only (counts, no spec list); direct links still render.
  When nothing needs attention the table is replaced by `_No rows need attention…_` and the
  collapsed UPDATED block.
- **Checks** is replaced by a one-line pointer to run the skill locally; the agent-only Checks step
  does not happen in CI.

Verdict names, Legend sentence, and the "every cited path comes from the script" rule are unchanged.

## Team roll-up

Same five sections. Differences:

- Title: `# PR test impact — @elastic/<team> — merged PRs, last <d> days (since <date>)`
- **Scope** adds: CODEOWNERS prefix count used to select PRs; matching vs analyzed PR counts;
  `**Cap hit:** only the 20 most recently merged PRs were analyzed (<k> skipped).` when applicable;
  a page-limit warning if the merged-PR listing was truncated; and a `PRs analyzed:` list
  (`[#n](url) title — p production / t test files`, `_(test-only)_` when p = 0).
- **Production files (uncovered first)** gains a leading `PR` column.
- **Checks** entries are prefixed with the PR link.

## Rules the agent must keep

- Verdict strings verbatim: `CANDIDATE COVERAGE — UPDATED`, `CANDIDATE COVERAGE — NOT UPDATED`,
  `NO EXISTING TEST`. Never "covered", "fully covered", "tested".
- The Legend sentence is present in every report, including all-UPDATED and test-only reports.
- Every cited test path comes from the script output. The markdown shortens paths for display
  (common root stated in Scope, colocated tests by file name, feature-path specs relative to their
  anchor dir); `--format json` always carries the full paths (`links[].path`, `citedTestPaths`).
- Checks: ≤ 5 per report, only from the diff of uncovered rows, skipped entirely when no row is
  uncovered. Remove the `<!-- agent: … -->` placeholder comment.
