# Output Formats

Read this file in Phase 5 before writing artifacts.

## REQUIRED before claiming a verdict

| Artifact | Must include |
|----------|----------------|
| `.qa-validator-session/plan-#N.json` | `issue`, `playbook`, `acs[]` with per-layer statuses, `live_targets[]`, `ci_check`, `live_engine` |
| `.agents/tmp/qa-validation-#N.json` | `verdict`, `acs[]`, `commands_run[]`, `reopen_recommendation` |
| `.agents/tmp/qa-validation-#N.md` | Summary table + per-AC static/automation/live; publish markers only in Phase 6 |

---

## Artifact paths

| File | Purpose |
|------|---------|
| `.qa-validator-session/plan-#<issue>.json` | Session state — one file per ticket (updated each phase) |
| `.qa-validator-session/live.env` | Preferred live cloud + Buildkite credentials (gitignored; copy from `live.env.example`) |
| `…/qa-ticket-validator/live.env` | Optional skill-dir fallback when session file is absent (also gitignored) |
| `.qa-validator-session/ci-tests-input.json` | Optional input for `ci_attestation.sh` |
| `.agents/tmp/qa-validation-#<issue>.json` | Machine-readable final result |
| `.agents/tmp/qa-validation-#<issue>.md` | Human-readable report (publish draft) |
| `.agents/tmp/qa-validation-#<issue>-live-steps.md` | Executable API/UI steps from Phase 3 |
| `.agents/tmp/test-plan-#<issue>.md` | Test plan draft (from test-plan-generator or discovered) |

Replace `<issue>` with the target issue number (no `#` in filename).

---

## plan-#N.json schema

Ticket-scoped path: `.qa-validator-session/plan-#<issue>.json` (e.g. `plan-#278718.json`). Never share one plan file across issues.

```json
{
  "session_id": "<uuid or ISO timestamp>",
  "issue": { "number": 0, "repo": "elastic/kibana", "title": "", "url": "" },
  "playbook": "cloud_security",
  "qa_cycle": {
    "phase": "entry | bc_available | serverless_promotion",
    "target_release": "9.5.0",
    "target_release_source": "main_default | live.env | cli | plan",
    "release_hint": "<milestone / BC tag or null>",
    "version_notes": ""
  },
  "ci_check": {
    "status": "ready | missing_token | invalid_token",
    "org": "elastic",
    "notes": ""
  },
  "node_check": {
    "status": "ready | node_mismatch",
    "required": "24.14.1",
    "actual": "24.14.1"
  },
  "environment": "both | stateful | serverless | unknown",
  "live_targets": [
    {
      "id": "ech",
      "pipeline": "ech_bc",
      "mode": "cloud | local_scout",
      "url": "",
      "config_status": "ready | missing_url | missing_creds | node_mismatch | scout_down | cloud_unreachable",
      "production_equivalent": true,
      "required_for_verdict": true,
      "notes": ""
    },
    {
      "id": "serverless",
      "pipeline": "serverless_qg",
      "mode": "cloud | local_scout",
      "domain": "security_complete",
      "url": "",
      "config_status": "ready",
      "production_equivalent": true,
      "required_for_verdict": true,
      "notes": ""
    }
  ],
  "live_engine": "exploratory-tester | bug-reproduce | ingest-only | null",
  "test_plan": {
    "status": "found_published | found_draft | generated_draft | missing",
    "source": "issue_comment | parent_comment | sub_issue_comment | local_draft | generated",
    "comment_url": null,
    "draft_path": "x-pack/solutions/security/plugins/security_solution/.agents/tmp/test-plan-#N.md",
    "scenario_count": 0,
    "manual_only_count": 0,
    "partial_automation_count": 0,
    "notes": "",
    "live_steps_path": "x-pack/solutions/security/plugins/security_solution/.agents/tmp/qa-validation-#N-live-steps.md",
    "scenarios": [
      {
        "title": "",
        "priority": "P0 | P1 | P2 | null",
        "feature_area": "",
        "plan_tag": "manual_only | partial_automation | automated_in_plan | unknown",
        "automation_coverage": "",
        "coverage_status": "stale_test_plan | true_manual | playbook_mappable | unmappable | null",
        "execution_mode": "api | ui | blocked | skipped | null",
        "ac_id": "AC-1 | null",
        "live_result": "PASS | FAIL | BLOCKED | SKIPPED | null"
      }
    ]
  },
  "linked_prs": [{ "number": 0, "merged": true, "url": "" }],
  "acs": [
    {
      "id": "AC-1",
      "text": "",
      "priority": "P0",
      "validation_tag": "static | automated | live_required | manual_blocked",
      "playbook_pattern": "entity_store_extraction | entity_store_api | entity_store_maintainers | entity_analytics_management | asset_inventory | csp_ui_flow | api_behavior | contextual_flyout | null",
      "static": { "status": "PASS | FAIL | BLOCKED | SKIPPED | null", "evidence": [] },
      "automation": {
        "mode": "ci_attestation | local_execution | null",
        "status": "PASS | FAIL | BLOCKED | SKIPPED | null",
        "target_release": "<QA target version or null>",
        "target_release_source": "main_default | live.env | cli | plan | null",
        "merge_version": "<version at merge commit or null>",
        "merge_commit": "<sha or null>",
        "kibana_version": "<deprecated alias for merge_version>",
        "tests": [
          {
            "path": "",
            "name": "",
            "framework": "jest | scout | ftr | cypress",
            "ci_scope": "expected_ran | skipped_selective",
            "runs": [
              {
                "pipeline": "kibana-pull-request | kibana-on-merge",
                "job": "<job name or null>",
                "status": "passed | failed | running | canceled | unknown",
                "finished_at": "<ISO-8601 or null>",
                "build_url": "",
                "commit": "",
                "kibana_version": ""
              }
            ]
          }
        ],
        "command": "<local fallback command only>",
        "evidence": []
      },
      "live": {
        "by_target": {
          "ech": { "status": "PASS | FAIL | BLOCKED | SKIPPED | null", "evidence": [] },
          "serverless": { "status": "PASS | FAIL | BLOCKED | SKIPPED | null", "evidence": [] }
        },
        "status": "PASS | FAIL | BLOCKED | SKIPPED | null",
        "evidence": []
      },
      "overall_status": "PASS | FAIL | BLOCKED | NOT_APPLICABLE | null"
    }
  ],
  "commands_run": [],
  "artifacts": []
}
```

**`environment`:** deprecated single-target hint. Prefer `live_targets[]`. Use `both` when ECH + serverless targets are active.

---

## Final JSON schema (`.agents/tmp/qa-validation-#N.json`)

```json
{
  "marker_version": "2",
  "issue": { "number": 0, "repo": "elastic/kibana", "title": "", "url": "" },
  "verdict": "VALIDATED | FAILED | INCONCLUSIVE",
  "playbook": "cloud_security",
  "qa_cycle": {},
  "ci_check": {},
  "live_targets": [],
  "node_check": {},
  "validated_at": "<ISO-8601 UTC>",
  "test_plan": {
    "status": "found_published | found_draft | generated_draft | missing",
    "manual_only_count": 0,
    "p0_true_manual_executed": 0,
    "p0_true_manual_blocked": 0
  },
  "acs": [],
  "linked_prs": [],
  "commands_run": [],
  "artifacts": [],
  "reopen_recommendation": "yes | no | needs_human",
  "reopen_reasoning": "",
  "local_scout_substitute": false
}
```

Set `local_scout_substitute: true` when any required target used `local_scout` with `production_equivalent: false`.

---

## Markdown report template

Line 1 **must** be the publish marker when preparing for Phase 6:

```markdown
<!-- qa-ticket-validated -->
<!-- generated-by: qa-ticket-validator -->

# QA Ticket Validation Report

**Issue:** [#<number>](<url>) — <title>
**Repo:** <owner>/<repo>
**Validated:** <ISO-8601 UTC>
**Playbook:** <playbook id>
**QA cycle:** <qa_cycle.phase> (target release: <target_release>, source: <target_release_source>)
**Overall verdict:** **VALIDATED | FAILED | INCONCLUSIVE**
**Live engine:** <live_engine or n/a>
**CI attestation:** <ci_check.status> (Buildkite org: <ci_check.org>)
**Test plan:** <test_plan.status> (<test_plan.source>)

## Live environment plan

| Target | Pipeline | Mode | Status | Notes |
|--------|----------|------|--------|-------|
| ECH | ech_bc | cloud | ready | … |
| Serverless | serverless_qg | local_scout | ready | Not production-equivalent |

## Summary

| AC | Priority | Tag | Static | Automation | Live (ECH) | Live (SL) | Overall |
|----|----------|-----|--------|------------|------------|-----------|---------|
| AC-1 | P0 | automated | PASS | PASS (CI) | SKIPPED | SKIPPED | PASS |

## Test plan coverage

| Scenario | Priority | Plan tag | Reconciled | Execution mode | Live result |
|----------|----------|----------|------------|----------------|-------------|
| Host extraction with broken mappings | P0 | manual_only | stale_test_plan | skipped | n/a |

**Manual gap summary:** P0 true_manual: N — converted: N, executed: N, blocked: N

## Linked PRs

- #<pr> — merged — <title>

## Per-AC detail

### AC-1: <short title>

**Text:** <full AC text>

#### Static
- Status: PASS
- Evidence: <paths, PR refs>

#### Automation (CI attestation)

- Mode: `ci_attestation`
- Status: PASS (CI) | FAIL (CI) | BLOCKED (no BK token) | SKIPPED (selective)
- Target release: `<target_release>` (source: `<target_release_source>`)
- Merge commit: `<sha>`
- Merge version: `<merge_version>` (version when CI ran)

| Test | Framework | CI scope | PR CI | On-merge | Merge ver. | Last run |
|------|-----------|----------|-------|----------|------------|----------|
| `asset_manager_client.test.ts` — "creates shared…" | jest | expected_ran | pass | pass | 9.5.0 | 2026-04-27 |

- Evidence: <build URLs, job names>

#### Automation (local fallback — only when used)

- Mode: `local_execution`
- Status: PASS | FAIL | BLOCKED
- Command: `<command run>`
- Evidence: <exit code, test names>

#### Live
- **ECH:** PASS — <evidence>
- **Serverless:** BLOCKED — <reason>
- **Aggregate:** BLOCKED

## Failure analysis

<Only when verdict is FAILED or INCONCLUSIVE>

- **Issue details:** ...
- **Suggested fixes:** ...
- **Reopen recommendation:** yes | no | needs_human
- **Reasoning:** ...

## Commands run

```
<list>
```

## Artifacts

- `.qa-validator-session/plan-#N.json`
- `.agents/tmp/qa-validation-#N.json`

---

## Local Scout footer (when applicable)

When `local_scout_substitute` is true, append:

> **Note:** One or more live targets used local Scout instead of cloud BC / serverless QG. Evidence is not production-equivalent; overall verdict capped at INCONCLUSIVE unless user accepted local-only validation.

---

## Verdict rules

**Per-target live (inside `live.by_target`):** same PASS/FAIL/BLOCKED/SKIPPED rules as aggregate live.

**Per-AC `live.status` (aggregate):**

| Condition | Status |
|-----------|--------|
| All required targets PASS for `live_required` AC | `PASS` |
| Any required target FAIL | `FAIL` |
| Any required target BLOCKED | `BLOCKED` |
| AC not `live_required` and no Phase 3 step spec for this AC | `SKIPPED` |
| P0 true_manual with Phase 3 step spec executed on ready target | `PASS` or `FAIL` from Path D |

**Per-AC overall_status:**

| Condition | Status |
|-----------|--------|
| All executed layers PASS for required tags | `PASS` |
| Any required layer FAIL | `FAIL` |
| Required layer not runnable | `BLOCKED` |
| AC obsolete / out of scope | `NOT_APPLICABLE` |

**Per-AC automation (CI attestation):**

| Condition | Status | Summary column |
|-----------|--------|----------------|
| `ci_check.status !== ready` | `BLOCKED` | `BLOCKED (no BK token)` |
| All `expected_ran` tests: jobs `passed` on both pipelines | `PASS` | `PASS (CI)` |
| Any required job `failed` | `FAIL` | `FAIL (CI)` |
| All tests `skipped_selective` only | `SKIPPED` | `SKIPPED (selective)` |
| On-merge build missing (recent merge) | `BLOCKED` | `BLOCKED (on-merge pending)` |

**Issue verdict:**

| Condition | Verdict |
|-----------|---------|
| All P0 AC `PASS`; no `local_scout_substitute` on required cloud targets | `VALIDATED` |
| Any P0 AC `FAIL` | `FAILED` |
| Any P0 AC `BLOCKED` without user override | `INCONCLUSIVE` |
| All P0 PASS but `local_scout_substitute` | `INCONCLUSIVE` (unless user accepted local-only) |
| P0 true_manual + Phase 4 live FAIL (Path D) | `FAILED` |
| P0 true_manual + Phase 4 live BLOCKED (env missing) | `INCONCLUSIVE` unless user override |

**Test plan reconciliation (Phase 3):**

| Condition | Action |
|-----------|--------|
| `coverage_status: stale_test_plan` | Note in report only — no live conversion |
| `coverage_status: true_manual` + `execution_mode: api\|ui` | Include in Phase 4 Path D |
| `coverage_status: unmappable` | `execution_mode: blocked`; ask user if P0 |

**Reopen recommendation:**

| Condition | Value |
|-----------|-------|
| P0 FAIL with clear regression | `yes` |
| BLOCKED / env missing | `needs_human` |
| PASS or NOT_APPLICABLE only | `no` |

---

## Publish marker

The publish script requires line 1:

```
<!-- qa-ticket-validated -->
```

Prepend before calling `scripts/publish_validation_report.sh`.
