# Live Validation (Phase 4)

Validate AC tagged `live_required` in a running environment — **per target** in `plan-#N.json` → `live_targets[]`.

**Read [`live-environment.md`](live-environment.md)** then [`exploratory-tester-bridge.md`](exploratory-tester-bridge.md) — capability detect and multi-target scope.

---

## Capability detect

```bash
ET_SKILL=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
if test -f "$ET_SKILL"; then
  LIVE_ENGINE=exploratory-tester
else
  LIVE_ENGINE=bug-reproduce
fi
```

If user passed `--live-report <path>` or `ingest exploratory report at <path>`, set `LIVE_ENGINE=ingest-only`.

Write `live_engine` to `plan-#N.json`.

---

## Target gates (replace single `environment` gate)

For each entry in `live_targets[]`:

| `config_status` | Action |
|-----------------|--------|
| `ready` | Run live checks for that target |
| not `ready` | Set `live.by_target[id].status: BLOCKED` with reason — do not FAIL |

| `mode` | `live_engine` | Action |
|--------|---------------|--------|
| `cloud` | either | Browser/API against `url` + creds from `live.env` |
| `local_scout` | `bug-reproduce` | Scout acceptance checks; ECH → stateful classic; serverless → `--arch serverless --domain <domain>` |
| `local_scout` | `exploratory-tester` | Delegate with target in scope `### Environment` block |

**Do not STOP** on serverless when `bug-reproduce` is engine — use **local serverless Scout** or cloud URL from `live.env` per target probe.

Re-run config probe from [`live-environment.md`](live-environment.md) if Phase 2 started Scout and URLs changed.

---

## Path A — exploratory-tester (preferred when skill exists)

Follow [`exploratory-tester-bridge.md`](exploratory-tester-bridge.md):

1. Build scope file from AC flows — include **all ready targets**
2. Delegate: read `exploratory-tester/SKILL.md` — **acceptance validation**, not open-ended bug hunt
3. Import `.exploratory-session/report.md` into `acs[].live.by_target` and aggregate `live.status`

Run **once per target** when modes differ (ECH cloud vs serverless local), or one session per target if exploratory-tester requires single env.

---

## Path B — bug-reproduce fallback (when exploratory-tester absent)

For each `live_required` AC × each **ready** target:

1. Read [`../../bug-reproduce/SKILL.md`](../../bug-reproduce/SKILL.md) Phases 1–2 for server readiness — **parameterize by target**:
   - **ECH / `local_scout`:** `node scripts/scout.js start-server --arch stateful --domain classic`
   - **Serverless / `local_scout`:** `node scripts/scout.js start-server --arch serverless --domain ${QA_SERVERLESS_DOMAIN:-security_complete}`
   - **Cloud:** skip Scout start; use `live_targets[].url` and creds from `live.env`
2. Frame steps as **acceptance checks** (verify expected behavior), not defect hunting
3. Use browser MCP or Playwright MCP if configured

**Acceptance check template per AC × target:**

| Step | Action |
|------|--------|
| 1 | Navigate to target `url` + login (cloud creds or `elastic`/`changeme` + `auth_provider_hint=cloud-basic` for local Scout) |
| 2 | Navigate to entry path from playbook |
| 3 | Perform user actions from AC text |
| 4 | Assert expected UI state, text, or API result |
| 5 | Screenshot → `.qa-validator-session/screenshots/<target-id>/ac-<id>-<slug>.png` |

**Do not** skip browser for UI AC because API passed.

Record per target:

```json
"live": {
  "by_target": {
    "ech": {
      "status": "PASS",
      "evidence": [
        "target: ech (local_scout)",
        "Navigated to Security > Cloud Security Posture > ...",
        "Screenshot: .qa-validator-session/screenshots/ech/ac-1-dashboard.png"
      ]
    },
    "serverless": {
      "status": "BLOCKED",
      "evidence": ["config_status: scout_down"]
    }
  },
  "status": "BLOCKED",
  "evidence": ["Aggregate BLOCKED — serverless target not ready"]
}
```

---

## Path C — ingest-only

When user supplies existing exploratory report:

1. Read report path (may be outside repo, e.g. Gloria clone `.exploratory-session/report.md`)
2. Apply import rules in `exploratory-tester-bridge.md` § Ingest existing report
3. Map flows to AC ids and target if documented in report

---

## Path D — test-plan live steps (Phase 3 output)

**Read first:** `.agents/tmp/qa-validation-#<issue>-live-steps.md` when present in `plan-#N.json` → `test_plan.live_steps_path`.

Run **before** ad-hoc Path A/B checks when the file exists.

### Scope

Execute step specs for scenarios where:

- `coverage_status` is `true_manual`, `playbook_mappable`, or `live_verification`
- `execution_mode` is `api` or `ui`
- User opted into validation run (live session requested or `live_targets[]` probed)

Do **not** execute scenarios still marked `stale_test_plan` — regenerate the test plan in Phase 3 first. Skip only when `execution_mode: blocked` or target `config_status` is not `ready`.

### Live verification (`coverage_status: live_verification`)

For P0 scenarios tagged `automated_in_plan` where release QA requires ECH/serverless replay:

1. Map step specs to Scout spec fixtures (same data setup as CI)
2. Execute API steps against ready `live_targets[]`
3. Record `live_result: PASS|FAIL` per scenario in `test_plan.scenarios[]`
4. CI attestation remains the primary automation evidence; live verification is supplementary

### API steps (`execution_mode: api`)

For each ready target in `live_targets[]`:

1. Load creds from `live.env` — session path preferred, skill-dir fallback (see [`live-environment.md`](live-environment.md))
2. Execute numbered steps in order (HTTP to Kibana or ES)
3. Record pass/fail per step in `test_plan.scenarios[].live_result`
4. Map results to linked `ac_id` → `acs[].live.by_target[<target_id>]`
5. Store evidence JSON under `.qa-validator-session/live-<target>-#<issue>.json` when script-based

**Canonical fixtures:** When step spec references a Scout spec path, reuse that spec's data setup (same approach as ECH live validation for entity store extraction).

### UI steps (`execution_mode: ui`)

1. Merge flows into `.agents/tmp/qa-validation-#<issue>-exploratory-scope.md` (see [`exploratory-tester-bridge.md`](exploratory-tester-bridge.md))
2. Delegate to exploratory-tester when skill present; else Path B browser checks
3. Import results into `test_plan.scenarios[].live_result` and `acs[].live`

### Blocked steps (`execution_mode: blocked`)

Set `live_result: BLOCKED` with prerequisite note. P0 blocked → may contribute to `INCONCLUSIVE` verdict.

### Aggregate live status

After Path D + Path A/B/C for `live_required` AC:

- Recompute `acs[].live.status` per existing rules
- P0 `true_manual` with `api|ui` and live FAIL → counts toward issue `FAILED`

---

## Live status rules

| Result | Status |
|--------|--------|
| Expected behavior observed with evidence | `PASS` |
| Expected not met | `FAIL` |
| Env/prerequisite missing | `BLOCKED` |
| AC not `live_required` and no Phase 3 step spec | `SKIPPED` |
| P0 `true_manual` with Phase 3 `execution_mode: api\|ui` | Execute Path D — not SKIPPED when user opted into live |
| P0 `automated_in_plan` with `live_verification` step spec | Execute Path D API replay on ready targets |
| Target not in scope (single-target override) | `SKIPPED` for that target |

Update `plan-#N.json` and `artifacts` with screenshot paths.

---

## Compute per-AC aggregate `live.status`

After all required targets for an AC:

- All required `by_target[id].status === PASS` → `live.status: PASS`
- Any `FAIL` → `live.status: FAIL`
- Any `BLOCKED` (and no FAIL) → `live.status: BLOCKED`

---

## Compute per-AC overall_status

After static, automation, and live layers for an AC:

- All required layers PASS → `overall_status: PASS`
- Any required layer FAIL → `overall_status: FAIL`
- Required layer BLOCKED → `overall_status: BLOCKED`

Required layers = non-SKIPPED tags on the AC.
