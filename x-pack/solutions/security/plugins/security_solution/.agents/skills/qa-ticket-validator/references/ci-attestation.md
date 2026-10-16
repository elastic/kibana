# CI Attestation (Phase 2 — default automation evidence)

Query **GitHub Checks** and **Buildkite** for each linked merged PR — do **not** re-run Scout/Jest locally unless the fallback path in [`automation-validation.md`](automation-validation.md) applies.

**Read this file in Phase 2** after Phase 1 static mapping. Requires `ci_check.status === ready` in `plan-#N.json` (see [`live-environment.md`](live-environment.md)).

---

## Purpose

For closed tickets with merged PRs, automated tests already ran in CI on the PR and (typically) on merge. Phase 2 records **when**, **where**, **status**, and **Kibana version** — it does not duplicate CI execution.

**CI scope (default):** attest builds for the merge commit on:

| Pipeline | Slug |
|----------|------|
| PR CI | `kibana-pull-request` |
| Post-merge | `kibana-on-merge` |

Additional pipeline slugs may appear in playbook `ci_hints` — never invent slugs from issue text.

---

## Prerequisites

1. `BUILDKITE_API_TOKEN` loaded from `live.env` (`.qa-validator-session/live.env` preferred; skill-dir `live.env` fallback — see [`live-environment.md`](live-environment.md))
2. `gh` authenticated for `elastic/kibana` (or target repo)
3. Phase 1 static catalog: mapped test files per `automated` AC
4. Linked merged PR(s) in `plan-#N.json` → `linked_prs[]`

If `ci_check.status !== ready`, set all `automated` AC `automation.status` to **BLOCKED** and skip to fallback evaluation in automation-validation.

---

## Recommended: helper script

From repo root:

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/scripts/ci_attestation.sh \
  --repo elastic/kibana \
  --pr <number> \
  --tests-json .qa-validator-session/ci-tests-input.json \
  [--release <version>] \
  [--plan-json .qa-validator-session/plan-#<issue>.json]
  [--issue <issue_number>]

Prefer `--issue N` (loads `.qa-validator-session/plan-#N.json`) or pass `--plan-json` explicitly.
```

The script outputs JSON to stdout. Parse into `plan-#N.json` → `acs[].automation`.

Input file format (`ci-tests-input.json`):

```json
{
  "tests": [
    {
      "path": "x-pack/solutions/security/plugins/entity_store/server/domain/asset_manager/asset_manager_client.test.ts",
      "name": "creates shared indices and data streams once during init",
      "framework": "jest",
      "job_name_fragments": ["jest", "ciGroup"]
    }
  ]
}
```

`job_name_fragments` optional — merge with playbook `ci_hints` when present.

---

## Manual resolution steps (if script unavailable)

### 1. Merge commit and versions

```bash
gh pr view <n> --repo elastic/kibana --json mergeCommit,labels
```

**Two version fields:**

| Field | Purpose | Resolution |
|-------|---------|------------|
| `target_release` | Release QA is validating (report header) | See [`resolve_target_release.sh`](../scripts/resolve_target_release.sh) |
| `merge_version` | Version at merge commit when CI ran | `git show <merge_sha>:package.json` → `.version` |

**`target_release` priority:**

1. `--release` CLI flag or user phrase `validate #N for 9.5.0`
2. `QA_TARGET_RELEASE` in `.qa-validator-session/live.env`
3. `plan-#N.json` → `qa_cycle.release_hint` (issue milestone)
4. Root `package.json` `.version` on current checkout (`main_default`)

**Do not** use PR backport labels (`v9.4.0`, etc.) for `target_release`. Record them as `backport_labels[]` for context only.

Per-run `kibana_version` on CI rows = **`merge_version`** (factual).

### 2. GitHub check-runs

```bash
gh api "repos/elastic/kibana/commits/<merge_sha>/check-runs" --paginate
```

Use `details_url` containing `buildkite.com` to cross-reference Buildkite build numbers.

### 3. Buildkite builds (per pipeline)

With `bk` CLI:

```bash
export BUILDKITE_API_TOKEN=...  # from live.env — never log
export BUILDKITE_ORGANIZATION_SLUG=elastic

bk build list -p kibana-pull-request --commit <merge_sha> --json
bk build list -p kibana-on-merge --commit <merge_sha> --json
```

REST fallback:

```bash
curl -s -H "Authorization: Bearer ${BUILDKITE_API_TOKEN}" \
  "https://api.buildkite.com/v2/organizations/${BUILDKITE_ORGANIZATION_SLUG}/pipelines/kibana-pull-request/builds?commit=<merge_sha>"
```

### 4. Jobs per build

```bash
bk build view <build_number> -p kibana-pull-request --json
```

Or REST: `.../pipelines/<slug>/builds/<number>/jobs`

Record per job: `name` or `step_key`, `state`, `finished_at`, `web_url`.

### 5. Map jobs to frameworks

| Framework | Job name / step_key fragments |
|-----------|------------------------------|
| `jest` | `jest`, `Jest`, `ciGroup` |
| `scout` | `scout`, `Scout`, plugin slug from path (e.g. `entity_store`) |
| `ftr` | `FTR`, `functional`, `api_integration` |
| `cypress` | `cypress`, `Cypress` |

Playbook `ci_hints.job_name_fragments` override defaults for a pattern.

Pick the **best matching job** per framework per pipeline. If no job matches, record `job: null` and status `unknown`.

### 6. Selective CI scope

```bash
gh pr diff <n> --repo elastic/kibana --name-only
```

| Condition | `ci_scope` |
|-------------|------------|
| Test file path in PR diff | `expected_ran` |
| Implementation path in same plugin/package directory touched | `expected_ran` |
| Test exists but neither condition met | `skipped_selective` |

`skipped_selective` → test-level status **SKIPPED** (not PASS). Note in report: *selective CI may not have executed this test on the PR*.

---

## Attestation status rules

Per `automated` AC (aggregate across its mapped tests):

| Condition | `automation.status` |
|-----------|---------------------|
| All `expected_ran` tests: required jobs `passed` on **both** pipelines | `PASS` |
| Any required job `failed` on either pipeline | `FAIL` |
| Build missing, token missing, checks `pending` | `BLOCKED` |
| All tests `skipped_selective` only | `SKIPPED` |
| AC not tagged `automated` | `SKIPPED` |

**Per-test run status:** normalize Buildkite `state` → `passed` | `failed` | `running` | `canceled` | `unknown`.

---

## plan-#N.json automation schema

```json
"automation": {
  "mode": "ci_attestation",
  "status": "PASS",
  "target_release": "9.5.0",
  "target_release_source": "main_default",
  "merge_version": "9.5.0",
  "merge_commit": "<sha>",
  "tests": [
    {
      "path": "x-pack/.../asset_manager_client.test.ts",
      "name": "creates shared indices and data streams once during init",
      "framework": "jest",
      "ci_scope": "expected_ran",
      "runs": [
        {
          "pipeline": "kibana-pull-request",
          "job": "Jest Unit Tests",
          "status": "passed",
          "finished_at": "2026-04-27T10:38:33Z",
          "build_url": "https://buildkite.com/elastic/kibana-pull-request/builds/434054",
          "commit": "16a406e7f97d6544d082a784476d79c90da977d9",
          "kibana_version": "9.5.0"
        },
        {
          "pipeline": "kibana-on-merge",
          "job": "Jest Unit Tests",
          "status": "passed",
          "finished_at": "2026-04-27T12:00:00Z",
          "build_url": "https://buildkite.com/elastic/kibana-on-merge/builds/12345",
          "commit": "16a406e7f97d6544d082a784476d79c90da977d9",
          "kibana_version": "9.5.0"
        }
      ]
    }
  ],
  "evidence": [
    "Both pipelines green on merge SHA 16a406e7",
    "kibana-pull-request build 434054",
    "kibana-on-merge build 12345"
  ]
}
```

Append lookup commands to `commands_run` (never secrets).

---

## Known limitations (v1)

- **Job-level attestation** — cannot prove an individual Playwright spec ran unless the job log is manually inspected.
- **Selective Scout** — a Scout job may run a config without every spec in the file.
- **On-merge delay** — `kibana-on-merge` may not exist immediately after merge; retry once or mark BLOCKED with note *on-merge build pending*.
- **MKI / quality-gate** — out of scope for v1; serverless evidence remains Phase 4 live.

Document these in Phase 5 report *Known limitations* when relevant.

---

## Local Scout fallback

Do **not** run local tests unless:

| Trigger | Action |
|---------|--------|
| `ci_check.status !== ready` and user approves local substitute | Fallback |
| CI attestation `BLOCKED` after retry | Fallback or BLOCKED |
| User explicitly says "re-run tests locally" | Fallback |

When fallback runs, set `automation.mode: local_execution` and follow [`automation-validation.md`](automation-validation.md) § Fallback.

---

## Failure handling

- Log build URLs and job names in evidence — not raw API responses with tokens.
- If static PASS but CI FAIL, note discrepancy in Phase 5.
- P0 automation FAIL → overall issue verdict `FAILED` unless user overrides.
- Continue other ACs on failure — do not abort entire session.
