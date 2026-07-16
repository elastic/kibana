# Security Solution Data Generator (`generate.ts`)

This directory contains a **fast, lightweight** data generator for Elastic Security development/testing.

It generates:

- **Realistic raw endpoint events** and **endpoint alerts** by replaying + scaling vendored attack episodes
- **Technology Watch pack events** (Okta, AWS IAM, Kubernetes, GitHub) with matching custom hunts
- **Full-fidelity Security detection alerts** with **honest attribution** (every alert comes from a rule whose query matched)
- **Optional synthetic Attack Discoveries (no LLM)** built from generated Security alerts (enable with `--attacks`)

## Honest alert attribution

Previously, the generator previewed an Insights-style rule once and copied those alerts onto ~15 prebuilt rules by overwriting only `rule_id` / `name` / `uuid`. Severity, MITRE, description, query, and reason stayed from the Insights rule (Frankenstein alerts).

**Now:**

- Episode endpoint alerts → preview/install **Endpoint Security** (`rule_id` `9a1a2dae-0b5f-4c3d-8305-a268d404c306`) with indices overridden to generator endpoint-alert indices. If that prebuilt rule is missing (common on minimal local installs), the generator creates a stand-in that reuses the same `rule_id` / description so alerts look authentic.
- Pack events → custom MITRE-tagged hunts whose queries match the seeded docs
- Copy path keeps the producing rule’s name / severity / MITRE / reason; it namespaces ids, sets `kibana.alert.rule.producer` to `siem`, attaches the installed rule uuid, and time-shifts `@timestamp` into `[start, end]`
- Ownership tags (`data-generator`, `pack:<id>`, and `data-generator-fp` for false positives) support `--clean` and FP evals; do not conflate with `elastic-security-sample-data`
- Index names avoid `logs-generator` / `insights.epN` tokens (packs use `logs-<dataset>.<date>`; episodes use opaque namespace tokens)

## Alert modes (`--alert-mode`)

| Mode | Behavior |
| --- | --- |
| `preview` (default) | Index docs → Rule Preview → copy honest alerts into `.alerts-security.alerts-<space>`. Alert `@timestamp` is jittered into `[start, end]`. |
| `live` | Index docs → install **and enable** rules. Detection engine creates alerts on schedule. Alert `@timestamp` is run time. Use `--rule-from` for lookback. Opt out of enabling with `--leave-rules-disabled`. |
| `none` | Index events only (no hunt install/enable, no preview minting, no Attack Discoveries/Cases). |

`--backfill` is intentionally out of scope.

## Technology Watch Packs (`--packs`)

Four curated Tier C (`authored`) packs under `scripts/data/packs/<id>/`:

| Pack id | Integration / dataset |
| --- | --- |
| `okta` | `okta` / `okta.system` |
| `aws-iam` | `aws` / `aws.cloudtrail` |
| `kubernetes` | `kubernetes` / `kubernetes.audit` |
| `github-actions` | `github` / `github.audit` |

Each pack has `events.ndjson`, matching `hunts.ts`, and `provenance.json`.

**Not included in this MVP:** FortiGate and Exchange (missing upstream content to port). Revisit when upstream scenarios exist.

Packs land in **concrete indices** (`logs-<dataset>.<YYYY.MM.DD>`, e.g. `logs-okta.system.2026.07.13`), not Fleet data streams. Names use dots (not a second hyphen) so creates do not match the `logs-*-*` data-stream-only template.

Light fidelity check: docs index cleanly, pack hunts fire in preview (logged; noisy on unexpected 0), provenance says `authored` + pinned integration/version.

## False positives (`--fp-count` 0–3)

When a hunt defines `falsePositives`, the generator indexes up to N benign variants that still trip the same query (honest preview|live matching).

**Required tags:** FP events get `data-generator` + `pack:<id>` + `data-generator-fp`. Preview-copy promotes `data-generator-fp` onto `kibana.alert.rule.tags` when the source event carries it. Hunt **rules** are never tagged `data-generator-fp` (that would mark every alert from the hunt as FP).

Episode noise fixtures (`noise1` / `noise2`) also receive `data-generator-fp`.

Optional `data_generator.ground_truth` is **not** written in this MVP (tags are enough; avoid inventing a second truth signal).

## Ownership for `--clean`

| Artifact | Cleanup key |
| --- | --- |
| Episode / pack indices | Concrete index names (current + legacy `logs-generator.*` / `insights.ep*`) |
| Pack hunt rules | Deterministic uuidv5 `rule_id`s (plus legacy `data-generator-pack-*`) and tags `data-generator` / `pack:<id>` |
| Detection alerts | Pack `rule_id`s, `kibana.alert.rule.tags` (`data-generator` / `data-generator-fp`), and `kibana.alert.ancestors.index` matching episode/pack indices (never delete by the real Endpoint Security `rule_id` alone) |
| Cases | Description fingerprint (plus legacy tagged cases) |
| Attack Discoveries | Synthetic connector name (assistant API may still tag discoveries; that path is separate) |

Do not conflate with unrelated `elastic-security-sample-data` installers.

Vendored fixtures still use documentation identities (`@corp.example`, `192.0.2.x`) on purpose. Those are sanitized content, not generator ownership markers.

## Entity catalog + graph enrichment

`lib/entities.ts` provides curated HOSTS/USERS with asset criticality. Episode scaling and packs apply:

- ECS `related.*`
- auto `host.target` / `user.target` (user+host → `host.target`; user-only → `user.target`; host-only → skip)
- existing `*.entity.relationships.*` on ported events are preserved

## Provenance & sanitization (vendored artifacts)

Episode fixtures under `scripts/data/episodes/**` and pack content under `scripts/data/packs/**` are **vendored / authored** artifacts:

- Synthetic identities (`@corp.example`, `192.0.2.x`)
- Do not update casually
- Pack provenance records `upstreamCommit` + `upstreamScenarioId` only (no verbatim upstream copy)

## Requirements

- Kibana + Elasticsearch running (local base path often `/kbn`)
- `yarn kbn bootstrap`
- Security detections initialized (`POST /api/detection_engine/index` is attempted by the script)
- Privileges for Detection Engine + write to generator indices / alerts

## Usage

From the `security_solution` package:

```bash
yarn data:generate -n 100 -h 5 -u 5 --start-date 1d --end-date now \
  --packs okta,aws-iam,kubernetes,github-actions
```

Or from the Kibana repo root:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/data/generate_cli.js \
  -n 100 -h 5 -u 5 \
  --start-date 1d --end-date now \
  --packs okta,aws-iam \
  --fp-count 1
```

Live mode (install + enable for engine alerts):

```bash
yarn data:generate --alert-mode live --rule-from now-7d --packs okta
```

Events only (no alerts / hunts):

```bash
yarn data:generate --alert-mode none -n 50 --packs okta
```

Local smoke (preview path):

```bash
yarn data:generate --clean -n 50 --episodes ep1 \
  --packs okta,aws-iam,kubernetes,github-actions \
  --kibanaUrl http://127.0.0.1:5601/kbn \
  --alert-mode preview
```

Then confirm in Alerts UI that `kibana.alert.rule.name` / severity / MITRE / reason match the producing rule, and that ownership tags (`data-generator`, `pack:<id>`) are present for cleanup.

## CLI arguments

### Data scale + time range

- `-n`, `--events`: Number of **source events** to generate (default: `100`)
- `-h`, `--hosts` / `-u`, `--users`: Entity pool sizes (default: `5`)
- `--start-date` / `--end-date`: Date math window (default: `1d` → `now`)
- `--seed`: Deterministic scaling
- `--clean`: Delete generator-owned episode indices, pack indices, alerts by rule_id, pack custom rules, discoveries, and cases

### Episodes + packs

- `--episodes`: Default `ep1-ep8,noise1,noise2`
- `--packs`: Comma-separated pack ids (`okta`, `aws-iam`, `kubernetes`, `github-actions`)
- `--fp-count`: `0`–`3` (default `0`)

### Alerts

- `--alert-mode`: `preview` (default) | `live` | `none`
- `--leave-rules-disabled`: With `live` only, install hunts but leave them disabled
- `--rule-from`: Lookback for installed pack rules (default `now-30d`)
- `--max-preview-invocations`: Cap preview invocations (default `12`)
- `--indexPrefix`: Endpoint index prefix (default `logs-endpoint`; avoid `logs-*-*` patterns in serverless)

### Optional extras

- `--attacks`: Synthetic Attack Discoveries
- `--cases`: Cases from ~50% of discoveries (implies `--attacks`)
- `--no-validate-fixtures`: Disable fixture validation

### Connection

- `--kibanaUrl` (default `http://127.0.0.1:5601`)
- `--elasticsearchUrl` (default `http://127.0.0.1:9200`)
- `--username` / `--password` or `--apiKey` / `ES_API_KEY`
- `--spaceId` (default `default`)

## What the script does (high level)

1. Connect to Kibana + ES
2. Best-effort install prebuilt rules (non-blocking)
3. Optional `--clean`
4. Scale + index episode events/alerts into concrete indices
5. Index selected packs (+ install custom MITRE hunts unless `alert-mode=none`)
6. Initialize detections / ensure preview index (skipped for `none`)
7. **preview:** honest Rule Preview per producing rule → copy  
   **live:** enable rules for the detection engine (unless `--leave-rules-disabled`)  
   **none:** stop after indexing
8. Optional Attack Discoveries / Cases (not for `none`, or live + `--leave-rules-disabled`)

## Out of scope (this PR)

Automated pack sync, Fleet data-stream install, `--backfill`, `--alert-density`, rule synthesizer, FortiGate/Exchange packs, Tier 0/A/B upgrades, Discover saved-search install, ThreatIntelEnrichment / indicators catalog, `refresh_pack_schema`.

## Troubleshooting

- **Bootstrap / babel errors**: run `yarn kbn bootstrap`
- **0 pack hunt alerts**: check concrete index name vs rule `index`, and that hunt queries match seeded `event.action` vocabulary; logs print per-rule counts
- **Endpoint Security missing**: install Elastic prebuilt rules, then re-run
- **Data-stream template rejects index create**: change `--indexPrefix` (avoid `logs-*-*`)
- **Alerts destination missing**: open Security once / init detections, then re-run
