# QA Ticket Validator — Setup and Usage

Automated release/QA ticket validation ([elastic/security-team#16243](https://github.com/elastic/security-team/issues/16243)).

**Skill path:** `x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/SKILL.md`

---

## When to run

Use when a **release ticket enters the QA cycle** — implementation merged, acceptance criteria present, pre-sign-off validation.

**Dual pipeline default:** live validation targets **both**:

| Target | Pipeline | Production equivalent |
|--------|----------|------------------------|
| **ECH** | BC (build candidate) on dedicated CI | Cloud-hosted ECH BC URL |
| **Serverless** | Quality gates; weekly promotion cadence | Serverless QG / MKI URL |

~99% of Security Solution tickets apply to **both** — the skill does not split tickets into ECH-only vs serverless-only unless the ticket explicitly scopes one deployment.

---

## How it works

1. You provide a GitHub issue (release/QA ticket with acceptance criteria).
2. Phase 0 resolves **live targets**, probes **Buildkite token** + **live.env** credentials, and writes a **Live environment plan**.
3. The agent runs **static** checks, **CI attestation** for mapped automated tests (no local re-run by default), **test plan coverage** (Phase 3), and **per-target live** checks for `live_required` AC and Phase 3 step specs.
4. Output lands in `.agents/tmp/qa-validation-#<issue>.md` and `.json` (gitignored).
5. When satisfied, you run publish to post a validation comment on the issue.

### Phases (0–6)

| Phase | Name | Mode |
|-------|------|------|
| 0 | Parse & plan | validate |
| 1 | Static validation | validate |
| 2 | CI attestation | validate |
| 3 | Test plan coverage & live step synthesis | validate |
| 4 | Live validation | validate |
| 5 | Verdict and report | validate |
| 6 | Publish to GitHub | publish only |

`validate ticket #N` runs phases 0–5 (report). `publish validation for #N` runs phase 6 only.

---

## Prerequisites

- [Cursor](https://cursor.com) or another agent runtime that loads `.agents/skills/`
- [GitHub CLI](https://cli.github.com/) — `gh auth login` with Elastic SSO authorized
- [Buildkite API token](https://buildkite.com/user/api-access-tokens) — read access to `elastic` org pipelines (`read_organizations`, `read_pipelines`, `read_builds`)
- Optional: [Buildkite CLI](https://github.com/buildkite/cli) (`bk`) — script falls back to REST API if absent
- **Node** matching root `package.json` `engines.node` (see [`.nvmrc`](../../../../../../.nvmrc)) — required for **local Scout fallback**, live API scripts, and Phase 4 execution. Before starting validation:

```bash
cd "$(git rev-parse --show-toplevel)"
nvm use    # installs/activates version from .nvmrc (e.g. 24.14.1)
node -v    # must match package.json engines.node exactly
```

If `node_check.status` is `node_mismatch`, resolve before Phase 4 local fallback or live scripts — CI attestation still works without matching Node.
- Kibana repo bootstrapped — `yarn kbn bootstrap`
- **Credentials** (Buildkite + optional cloud live) — **load order:** `.qa-validator-session/live.env` if present, else skill-dir `…/qa-ticket-validator/live.env` (both gitignored; session wins when both exist):

```bash
mkdir -p .qa-validator-session
cp x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/live.env.example \
   .qa-validator-session/live.env
# Edit .qa-validator-session/live.env — never commit
# Optional: keep a filled live.env under the skill dir as a convenience fallback
```

| Variable | Purpose |
|----------|---------|
| `BUILDKITE_API_TOKEN` | **Required** for Phase 2 CI attestation |
| `BUILDKITE_ORGANIZATION_SLUG` | Default `elastic` |
| `QA_TARGET_RELEASE` | Optional — target release for QA (defaults to `package.json` version on current branch) |
| `QA_ECH_KIBANA_URL` | ECH BC / cloud-hosted QA |
| `QA_ECH_API_KEY` | ECH auth (**preferred**) |
| `QA_ECH_USERNAME` / `QA_ECH_PASSWORD` | ECH auth fallback |
| `QA_SERVERLESS_KIBANA_URL` | Serverless quality-gate env |
| `QA_SERVERLESS_API_KEY` | Serverless auth (**preferred**) |
| `QA_SERVERLESS_USERNAME` / `QA_SERVERLESS_PASSWORD` | Serverless auth fallback |
| `QA_SERVERLESS_DOMAIN` | Default `security_complete` |
| `QA_ALLOW_LOCAL_SCOUT=1` | Use local Scout when cloud URLs or Buildkite token missing (with user approval) |

- **Automation phase (default):** CI attestation via [`ci_attestation.sh`](../../.agents/skills/qa-ticket-validator/scripts/ci_attestation.sh) — `kibana-pull-request` + `kibana-on-merge` on PR merge commit
- **Automation phase (fallback):** local Scout — only when token missing, CI BLOCKED, or user requests re-run
- **Live phase (local fallback):**
  - ECH: stateful Scout on `http://localhost:5620`
  - Serverless: `node scripts/scout.js start-server --arch serverless --domain security_complete`
- **Live phase (cloud):** browser/API against URLs in `live.env`
- **Live phase (after [kibana#270279](https://github.com/elastic/kibana/pull/270279)):** `exploratory-tester` skill — auto-detected when present

Local Scout is **not production-equivalent** to ECH BC or serverless QG — reports note this and may cap verdict at **INCONCLUSIVE**.

### Skill symlink (optional, Claude Code)

```bash
SKILL=x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator
ln -sf "$(git rev-parse --show-toplevel)/$SKILL" ~/.claude/skills/qa-ticket-validator
```

---

## Commands

| Intent | Example |
|--------|---------|
| Validate | `/qa-ticket-validator validate ticket #12345` |
| Validate for release | `/qa-ticket-validator validate ticket #12345 for 9.5.0` |
| Validate (security-team) | `/qa-ticket-validator validate https://github.com/elastic/security-team/issues/16243` |
| Publish | `/qa-ticket-validator publish validation for #12345` |

Publish runs:

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/scripts/publish_validation_report.sh \
  [--repo elastic/kibana] <issue_number> .agents/tmp/qa-validation-#<issue>.md
```

Manual CI attestation (debug):

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/scripts/ci_attestation.sh \
  --repo elastic/kibana \
  --pr 265677 \
  --tests-json .qa-validator-session/ci-tests-input.json \
  --plan-json .qa-validator-session/plan-#<issue>.json
  # or: --issue <issue>
```

**Expect:** Phase 2 CI attestation table with PR CI + on-merge columns, **target release** in header, **merge version** on CI rows, last run dates — **no** local Scout startup.

---

## When to use which skill

| Skill | Use when |
|-------|----------|
| **qa-ticket-validator** | Release QA cycle — verify shipped ticket AC (ECH + serverless); reconciles test plan manual gaps |
| **test-plan-generator** | Before/during dev — write test plan from issue (validator may generate **draft only** in Phase 3) |
| **bug-validator** | Triage open bugs — static only |
| **bug-reproduce** | Investigate a bug — live repro for fix workflow |
| **exploratory-tester** | Exploratory/regression browser testing — unknown bugs |

---

## Artifacts

| Path | Purpose |
|------|---------|
| `.qa-validator-session/plan-#N.json` | Per-ticket session state with `live_targets[]`, `ci_check` (gitignored) |
| `.qa-validator-session/live.env` | Preferred Buildkite + cloud credentials (gitignored) |
| `…/qa-ticket-validator/live.env` | Optional skill-dir fallback if session file missing (gitignored) |
| `.qa-validator-session/ci-tests-input.json` | Input for `ci_attestation.sh` |
| `.qa-validator-session/live-ech-#N.json` | ECH live evidence (when API steps run) |
| `.agents/tmp/test-plan-#N.md` | Test plan draft (discovered or generated in Phase 3) |
| `.agents/tmp/qa-validation-#N-live-steps.md` | Executable API/UI steps from Phase 3 |
| `.qa-validator-session/screenshots/<target>/` | Live evidence per target (gitignored) |
| `.agents/tmp/qa-validation-#N.md` | Human report draft |
| `.agents/tmp/qa-validation-#N.json` | Machine-readable result |

GitHub comment marker: `<!-- qa-ticket-validated -->` on line 1.

---

## Scope limitations

- One ticket per run
- CI attestation is **job-level** (v1) — not per Playwright spec name; see [`ci-attestation.md`](../../.agents/skills/qa-ticket-validator/references/ci-attestation.md)
- MKI / `security_solution_quality_gate` periodic pipelines not attested in v1 (serverless QG remains Phase 4 live)
- No automatic BC URL discovery from Buildkite
- No cloud/MKI/Fleet agent auto-provisioning — user supplies URLs or accepts local Scout
- Default playbook: **`cloud_security`** (entity store, entity analytics, asset inventory; CSP patterns legacy)

---

## Dry-run checklist

### 1. Static dry-run (no Buildkite)

```
/qa-ticket-validator validate ticket https://github.com/elastic/security-team/issues/16243
```

**Expect:** Phase 0 completes or stops with `BLOCKED: insufficient ticket`; `live_targets[]` and `ci_check` in `plan-#N.json`; Live environment plan in report.

### 2. Config probe (no live.env)

**Expect:** `ci_check.status: missing_token` → automation BLOCKED; live targets BLOCKED or `local_scout` if `QA_ALLOW_LOCAL_SCOUT=1` and Scout up.

### 3. Automation dry-run (Buildkite token + merged PR)

Pick a merged kibana PR with tests (e.g. [kibana#265677](https://github.com/elastic/kibana/pull/265677) for entity store).

**Expect:** Phase 2 CI attestation table with PR CI + on-merge columns, **target release** in header, **merge version** on CI rows, last run dates — **no** local Scout startup.

### 2b. Test plan dry-run (Phase 3)

Pick an issue with a local draft test plan (e.g. `.agents/tmp/test-plan-#269260.md`) or one without any plan.

**Expect:** Phase 3 parses scenarios via `parse_test_plan_scenarios.sh`, reconciles manual-only rows against CI/static, writes `qa-validation-#N-live-steps.md` when true_manual gaps exist. Generated test plans stay as **draft only** — not published to GitHub.

```bash
bash x-pack/solutions/security/plugins/security_solution/.agents/skills/qa-ticket-validator/scripts/parse_test_plan_scenarios.sh \
  x-pack/solutions/security/plugins/security_solution/.agents/tmp/test-plan-#269260.md
```

### 3. Live dry-run (dual targets)

Same ticket with `live_required` AC; configure `live.env` or local Scout for both arches.

**Expect:** Report columns **Live (ECH)** and **Live (SL)**; screenshots under `.qa-validator-session/screenshots/ech/` and `.../serverless/`.

### 4. Publish dry-run (optional)

On a test issue you own: prepend marker, run publish script, confirm comment created.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `gh` 403 SAML | Authorize token for `elastic` org |
| `BUILDKITE_API_TOKEN` missing | Fill `.qa-validator-session/live.env` (preferred) or skill-dir `live.env` (fallback) from `live.env.example` |
| Buildkite 401 | Regenerate token at [buildkite.com/user/api-access-tokens](https://buildkite.com/user/api-access-tokens) |
| On-merge build missing | Recent merge — wait and retry; or mark automation BLOCKED with note |
| Automation BLOCKED, need evidence | Set `QA_ALLOW_LOCAL_SCOUT=1` and approve local Scout fallback |
| Node mismatch (local fallback only) | `nvm use` to match `package.json` engines |
| Scout not available | `node scripts/scout.js start-server ...`; wait for `/api/status` |
| No AC extracted | Add explicit acceptance criteria to issue |
| Cloud live BLOCKED | Fill `live.env` or set `QA_ALLOW_LOCAL_SCOUT=1` |
| Serverless live | Local: `--arch serverless --domain security_complete`; cloud: `QA_SERVERLESS_*` vars |

---

## Tracking

- Product issue: [elastic/security-team#16243](https://github.com/elastic/security-team/issues/16243)
- Related: [elastic/kibana#270279](https://github.com/elastic/kibana/pull/270279) (`exploratory-tester`)
- Playbook reference: [`cloud_security.md`](../../.agents/skills/qa-ticket-validator/references/playbooks/cloud_security.md)
- CI attestation: [`ci-attestation.md`](../../.agents/skills/qa-ticket-validator/references/ci-attestation.md)
- Live env reference: [`live-environment.md`](../../.agents/skills/qa-ticket-validator/references/live-environment.md)
- Test plan bridge: [`test-plan-bridge.md`](../../.agents/skills/qa-ticket-validator/references/test-plan-bridge.md)
