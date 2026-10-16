# Live Environment (Phase 0 — after AC extraction)

Resolve **which Kibana instances** live validation must run against, probe config/credentials, and write **`live_targets[]`** + **`qa_cycle`** into `plan-#N.json`.

**Read this file in Phase 0** after [`ac-extraction.md`](ac-extraction.md) initializes ACs and before Phase 1.

---

## QA cycle context

Use when a **release ticket enters QA** (implementation merged, AC present) — not ad-hoc bug triage.

Infer `qa_cycle` from issue milestone, labels, comments, linked PRs:

| Signal | `qa_cycle.phase` |
|--------|------------------|
| Merged PR; ticket in QA / “ready for QA” | `entry` |
| BC (build candidate) version or build URL in issue or release thread | `bc_available` |
| Serverless promotion / quality-gate week reference | `serverless_promotion` |

Set `qa_cycle.release_hint` from issue milestone, user phrase (`validate #N for 9.5.0`), or BC tag when present (string or `null`).

### Target release resolution

Phase 0 must resolve **`qa_cycle.target_release`** — the release QA is validating (BC/QG context, report header). This is **not** the same as PR backport labels (`v9.4.0`, etc.).

Run from repo root after loading `live.env`:

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/scripts/resolve_target_release.sh \
  [--release <version>] \
  [--plan-json .qa-validator-session/plan-#<issue>.json]
```

**Priority (highest wins):**

| Priority | Source | `target_release_source` |
|----------|--------|-------------------------|
| 1 | `--release` CLI or user phrase `for 9.5.0` | `cli` |
| 2 | `QA_TARGET_RELEASE` in `live.env` | `live.env` |
| 3 | `plan-#N.json` → `qa_cycle.release_hint` (issue milestone) | `plan` |
| 4 | Root `package.json` `.version` on current checkout | `main_default` |

**Never** use PR backport labels for `target_release`. Record them separately as `linked_prs[].backport_labels[]` when present.

Write to `plan-#N.json`:

```json
"qa_cycle": {
  "phase": "entry",
  "target_release": "9.5.0",
  "target_release_source": "main_default",
  "release_hint": "9.5.0"
}
```

If `QA_TARGET_RELEASE` conflicts with issue milestone, config wins — note in `qa_cycle.version_notes`.

**CI merge version:** Phase 2 records `merge_version` from `git show <merge_sha>:package.json` separately (factual version when CI ran). Report header uses `target_release`; CI table shows `merge_version`.

## Default live targets (both pipelines)

**Security Solution release QA:** populate **both** targets — do **not** split tickets into ECH-only vs serverless-only (~99% apply to both).

| `id` | `pipeline` | Production-equivalent |
|------|------------|------------------------|
| `ech` | `ech_bc` | ECH BC on dedicated CI (cloud-hosted build candidate) |
| `serverless` | `serverless_qg` | Serverless quality-gate env (weekly promotion cadence) |

**Override to a single target** only when ticket **explicitly** scopes one deployment:

- AC/body: “serverless only”, “ECH only”, “ESS only”
- All relevant automation tagged `@skipInServerless` **and** no ECH AC

Record override in `live_targets` notes and drop the non-applicable target.

---

## Config file contract

### Where to put `live.env`

| Priority | Path | Role |
|----------|------|------|
| 1 (preferred) | `.qa-validator-session/live.env` | Runtime session credentials (gitignored via `.qa-validator-session/`) |
| 2 (fallback) | `…/qa-ticket-validator/live.env` | Convenience copy next to the skill (also gitignored via `**/qa-ticket-validator/live.env`) |

**Load order:** use the session file when it exists; otherwise fall back to the skill-dir `live.env`. If both exist, **session wins** (do not merge). Scripts (`ci_attestation.sh`) and Phase 0/4 probes follow the same order.

Copy template (preferred session path):

```bash
mkdir -p .qa-validator-session
cp x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/live.env.example \
   .qa-validator-session/live.env
# Edit .qa-validator-session/live.env — never commit; never paste secrets in chat
```

Optional: keep a filled `live.env` under the skill dir for local convenience — still never commit; rotate tokens if exposed.

Load before probe (from repo root):

```bash
set -a
if [ -f .qa-validator-session/live.env ]; then
  . .qa-validator-session/live.env
elif [ -f x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/live.env ]; then
  . x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/live.env
fi
set +a
```

**Never** print passwords or API keys in reports or chat — reference env var **names** only.

For Elastic Cloud **provisioning** when URLs are absent, user may invoke the repo **cloud-setup** skill — not auto-run in initial scope.

---

## CI attestation probe (Buildkite)

Phase 2 automation evidence requires Buildkite API access. After loading `live.env`, probe and write `ci_check` to `plan-#N.json`:

| `BUILDKITE_API_TOKEN` | `ci_check.status` |
|-----------------------|-------------------|
| Set (non-empty) | `ready` |
| Unset or empty | `missing_token` |

```json
"ci_check": {
  "status": "ready | missing_token",
  "org": "elastic"
}
```

Use `BUILDKITE_ORGANIZATION_SLUG` when set; default `elastic`.

| `ci_check.status` | Phase 2 action |
|-------------------|----------------|
| `ready` | Run CI attestation per [`ci-attestation.md`](ci-attestation.md) |
| `missing_token` | Automation layer **BLOCKED** for `automated` AC; user may opt into local Scout fallback (`QA_ALLOW_LOCAL_SCOUT=1` or explicit approval) |

Optional smoke (do not print token):

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${BUILDKITE_API_TOKEN}" \
  "https://api.buildkite.com/v2/organizations/${BUILDKITE_ORGANIZATION_SLUG:-elastic}"
```

HTTP `200` confirms token works; `401` → note in `ci_check.notes` as `invalid_token`.

---

## Node bootstrap gate (shared)

Before automation or live:

```bash
REQUIRED=$(node -p "require('./package.json').engines.node")
ACTUAL=$(node -v | sed 's/^v//')
# Compare REQUIRED vs ACTUAL — exact match for validation runs
```

| Result | Action |
|--------|--------|
| Match | Set `node_check.status: ready` in plan-#N.json |
| Mismatch | `node_check.status: node_mismatch` — **BLOCKED** local Scout fallback + live; CI attestation unaffected; evidence: required vs actual; suggest `nvm use` / install from root `engines.node` |

Record in `plan-#N.json`:

```json
"node_check": { "status": "ready | node_mismatch", "required": "24.14.1", "actual": "20.18.2" }
```

---

## Config probe per target

For each entry in `live_targets`, determine **`mode`** and **`config_status`**.

### ECH (`id: ech`)

| Priority | Mode | When |
|----------|------|------|
| 1 | `cloud` | `QA_ECH_KIBANA_URL` + auth (`QA_ECH_API_KEY` **or** `QA_ECH_USERNAME` + `QA_ECH_PASSWORD`) |
| 2 | `local_scout` | User approves local substitute **or** cloud creds missing — use Scout stateful |

**Auth resolution (ECH):** prefer `QA_ECH_API_KEY` when set; otherwise use `QA_ECH_USERNAME` + `QA_ECH_PASSWORD`. Record `auth_method: api_key | basic` in `live_targets[].notes` (never log the secret).

**Cloud probe (API key — preferred):**

```bash
curl -s -H "Authorization: ApiKey ${QA_ECH_API_KEY}" "${QA_ECH_KIBANA_URL%/}/api/status" \
  | python3 -c "import sys,json; s=json.load(sys.stdin); exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"
```

**Cloud probe (basic auth — fallback when `QA_ECH_API_KEY` is unset):**

```bash
curl -s -u "${QA_ECH_USERNAME}:${QA_ECH_PASSWORD}" "${QA_ECH_KIBANA_URL%/}/api/status" \
  | python3 -c "import sys,json; s=json.load(sys.stdin); exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"
```

**Local Scout probe** (default URL `http://localhost:5620`):

```bash
curl -s -u elastic:changeme http://localhost:5620/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"
```

If local down, start (Phase 2 may reuse):

```bash
node scripts/scout.js start-server --arch stateful --domain classic &
```

### Serverless (`id: serverless`)

| Priority | Mode | When |
|----------|------|------|
| 1 | `cloud` | `QA_SERVERLESS_KIBANA_URL` + auth (`QA_SERVERLESS_API_KEY` **or** `QA_SERVERLESS_USERNAME` + `QA_SERVERLESS_PASSWORD`) |
| 2 | `local_scout` | User approves local substitute **or** cloud creds missing |

**Auth resolution (serverless):** same as ECH — prefer `QA_SERVERLESS_API_KEY`, else username/password.

Domain: `QA_SERVERLESS_DOMAIN` (default `security_complete`).

**Local serverless Scout:**

```bash
node scripts/scout.js start-server --arch serverless --domain "${QA_SERVERLESS_DOMAIN:-security_complete}" &
```

Probe URL from Scout docs / status endpoint for serverless local (record actual URL in `live_targets[].url` after server up).

### `config_status` values

| Status | Meaning |
|--------|---------|
| `ready` | URL reachable, auth works (or local Scout up) |
| `missing_url` | Cloud mode selected but URL empty |
| `missing_creds` | URL set but no auth (`QA_*_API_KEY` and username/password both missing) |
| `node_mismatch` | Node gate failed |
| `scout_down` | Local Scout not running and start failed |
| `cloud_unreachable` | curl/status probe failed |

`config_status != ready` → Phase 4 live for that target is **BLOCKED** (not FAIL).

---

## Local Scout substitute rules

When **`mode: local_scout`** is used instead of cloud BC / serverless QG:

- Set `live_targets[].production_equivalent: false`
- Phase 5 report **footer** must note: *Local Scout is not production-equivalent to ECH BC / serverless QG.*
- If **any** required target uses `local_scout` while user requested full QA sign-off, cap overall verdict at **`INCONCLUSIVE`** unless user explicitly accepts local-only evidence.

User approval phrases: “use local Scout”, “local is OK for this run”.

---

## Initialize `live_targets` in plan-#N.json

After probe, write:

```json
"qa_cycle": {
  "phase": "entry",
  "target_release": "9.5.0",
  "target_release_source": "main_default",
  "release_hint": "9.5.0"
},
"ci_check": { "status": "ready", "org": "elastic", "notes": "" },
"node_check": { "status": "ready", "required": "24.14.1", "actual": "24.14.1" },
"environment": "both",
"live_targets": [
  {
    "id": "ech",
    "pipeline": "ech_bc",
    "mode": "cloud",
    "url": "https://...",
    "config_status": "ready",
    "production_equivalent": true,
    "required_for_verdict": true,
    "notes": ""
  },
  {
    "id": "serverless",
    "pipeline": "serverless_qg",
    "mode": "local_scout",
    "domain": "security_complete",
    "url": "http://localhost:5620",
    "config_status": "ready",
    "production_equivalent": false,
    "required_for_verdict": true,
    "notes": "Cloud QG URL not configured — local serverless Scout"
  }
]
```

**Deprecated:** single `environment` field (`stateful` | `serverless` | `unknown`) — set `environment: both` when both targets active; keep legacy value only when single-target override applies.

---

## Live environment plan (Phase 0 output)

Copy into Phase 5 markdown (see [`output-formats.md`](output-formats.md)):

```markdown
## Live environment plan

| Target | Pipeline | Mode | Status | Notes |
|--------|----------|------|--------|-------|
| ECH | ech_bc | cloud | ready | BC URL from QA_ECH_KIBANA_URL |
| Serverless | serverless_qg | local_scout | ready | Not production-equivalent |
```

---

## Per-AC live schema

Initialize each AC `live` block:

```json
"live": {
  "by_target": {
    "ech": { "status": null, "evidence": [] },
    "serverless": { "status": null, "evidence": [] }
  },
  "status": null,
  "evidence": []
}
```

**Aggregate `live.status`:** `PASS` only if every **required** target with `live_required` AC has `by_target[id].status === PASS`. Any `FAIL` → `FAIL`. Any `BLOCKED` → `BLOCKED`. Non-applicable targets → `SKIPPED`.

---

## Checkpoint (Phase 0)

Before Phase 1:

- [ ] `qa_cycle` and `live_targets[]` written
- [ ] `ci_check` probed (`BUILDKITE_API_TOKEN`)
- [ ] `node_check` run
- [ ] Config probe completed for each target
- [ ] Live environment plan table ready for Phase 5
- [ ] User notified if any target BLOCKED and cloud creds needed
- [ ] User notified if `ci_check.status === missing_token` (Phase 2 automation BLOCKED unless local fallback approved)
