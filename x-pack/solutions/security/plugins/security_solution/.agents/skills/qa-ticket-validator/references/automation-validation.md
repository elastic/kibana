# Automation Evidence (Phase 2)

Collect **automation evidence** for AC tagged `automated`. Default path is **CI attestation** — query GitHub + Buildkite for merge-commit test status. **Do not** start Scout or re-run tests locally unless the fallback section applies.

---

## Default: CI attestation

Read [`ci-attestation.md`](ci-attestation.md) and follow every step.

**Quick path:**

1. Confirm `ci_check.status === ready` in `plan-#N.json`.
2. Build `.qa-validator-session/ci-tests-input.json` from Phase 1 static catalog + playbook `ci_hints`.
3. For each linked merged PR:

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/scripts/ci_attestation.sh \
  --repo elastic/kibana \
  --pr <number> \
  --tests-json .qa-validator-session/ci-tests-input.json
```

4. Merge script JSON into `plan-#N.json` → `acs[].automation` for matching AC.
5. Append the script invocation to `commands_run` (no tokens).

If `ci_check.status !== ready`, set `automation.status` to **BLOCKED** for all `automated` AC and evaluate fallback below.

---

## When CI attestation is sufficient

| Situation | Action |
|-----------|--------|
| Closed ticket + merged PR + `automation.status === PASS` | No local run |
| `skipped_selective` tests only | Report SKIPPED; do not local-run unless user insists |
| `FAIL (CI)` | Report FAIL with build URLs; local re-run only if user asks |

---

## Fallback: local execution

Run Scout/API/Jest **only** when:

| Trigger | Action |
|---------|--------|
| `ci_check.status !== ready` and user approves (`QA_ALLOW_LOCAL_SCOUT=1` or explicit phrase) | Local fallback |
| CI attestation `BLOCKED` after retry (e.g. on-merge build pending) | Local fallback or remain BLOCKED |
| User explicitly says "re-run tests locally" | Local fallback |

Set `automation.mode: local_execution` when fallback runs.

### Prerequisites (local only)

0. **Node version** — must match root `package.json` `engines.node`. If `node_check.status === node_mismatch`, local fallback is **BLOCKED**.

1. **Scout server** (if not already running):

```bash
node scripts/scout.js start-server --arch stateful --domain classic &
```

Wait until Kibana is available:

```bash
curl -s -u elastic:changeme http://localhost:5620/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); \
    exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"
```

2. **API-only checks** — source Kibana API helpers:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"
```

See repo skill `.agents/skills/kibana-api/SKILL.md`.

### Run Scout tests

From playbook `automation.command` template:

```bash
node scripts/scout run-tests \
  --arch stateful \
  --domain classic \
  --config <path/to/playwright.config.ts> \
  --testFiles <spec_path>
```

**Entity store examples:**

| Pattern | Config | Spec |
|---------|--------|------|
| Extraction / broken mapping | `x-pack/solutions/security/plugins/entity_store/test/scout/api/playwright.config.ts` | `.../tests/logs_extraction_broken_mapping.spec.ts` |
| Entity store CRUD | same config | `.../tests/crud_api.spec.ts` |
| Install / update | same config | `.../tests/install_update.spec.ts` |

Capture: exit code, stdout/stderr tail, failing test title if any.

### API smoke via kibana_curl

When playbook lists `kibana_api` instead of Scout:

```bash
kibana_curl -s -X GET "/api/..." | python3 -m json.tool
```

### Local status rules

| Result | Status |
|--------|--------|
| Exit 0, assertions pass | `PASS` |
| Exit non-zero or assertion fail | `FAIL` |
| Server not up / spec not found | `BLOCKED` |

```json
"automation": {
  "mode": "local_execution",
  "status": "PASS",
  "command": "node scripts/scout run-tests ...",
  "evidence": ["exit 0", "install_update.spec.ts — Should install the entity store happy path"]
}
```

---

## Failure handling

- Log build URLs (CI) or failing test names (local) in evidence.
- If static PASS but automation FAIL, note discrepancy in Phase 5 report.
- P0 automation FAIL → overall issue verdict `FAILED` unless user overrides.
- Continue other ACs on failure — do not abort entire session.
