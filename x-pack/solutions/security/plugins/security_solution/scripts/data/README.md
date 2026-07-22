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

## Technology Watch Packs (`--packs`)

Four curated Tier C (`authored`) packs under `scripts/data/packs/<id>/`. Event stories and hunt ideas are a sanitized, re-implemented port from [elastic/security-data-generator-app](https://github.com/elastic/security-data-generator-app) (not a verbatim copy).

| Pack id | Integration / dataset |
| --- | --- |
| `okta` | `okta` / `okta.system` |
| `aws-iam` | `aws` / `aws.cloudtrail` |
| `kubernetes` | `kubernetes` / `kubernetes.audit` |
| `github-actions` | `github` / `github.audit` |

Each pack has `events.ndjson`, matching `hunts.ts`, and `provenance.json`.

**Not included in this MVP:** FortiGate and Exchange (no scenarios in that app to port yet). Revisit when they exist.

Packs land in **concrete indices** (`logs-<dataset>.<YYYY.MM.DD>`, e.g. `logs-okta.system.2026.07.13`), not Fleet data streams. Names use dots (not a second hyphen) so creates do not match the `logs-*-*` data-stream-only template.

Light fidelity check: docs index cleanly, pack hunts fire in preview (logged; noisy on unexpected 0), provenance says `authored` + pinned integration/version.

## False positives (`--fp-count` 0–3)

When a hunt defines `falsePositives`, the generator indexes up to N benign **source events per hunt** (not per pack) that still trip that hunt’s query. Alerts come from preview|live matching afterward.

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
- Pack provenance records `upstreamCommit` + `upstreamScenarioId` pointing at [elastic/security-data-generator-app](https://github.com/elastic/security-data-generator-app) (SHA only, no verbatim copy)

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

## Threat intel RSS (mustard demo)

`--threat-intel` seeds **one enabled RSS source per selected pack** into `.kibana-threat-intel-sources`, plus a digest subscription in `.kibana-threat-intel-subscriptions`. Each feed is a `data:application/rss+xml,...` URL whose article text embeds that pack’s observables so mustard `source_ingestion` + `nl_extraction_behavioral` can extract IOCs and hunt into the pack indices.

Observable contract in `lib/threat_intel_fixtures.ts` (`PACK_TI_SCENARIOS`):

- **`joinIocs`** (`ip` / `email` / `user`): environment join keys. Must appear in RSS (canonical + optional defanged IP) **and** on pack docs after `ensureEcsSourceIp` + `enrichDocForGraph`, in the ECS fields mustard hunt searches (`source.ip` / `related.ip` / `user.*` / `related.user`, …).
- **`narrative`**: MITRE ids, event.actions, ARNs, short nicknames. RSS flavor / hunt-rule pairing only — not required on pack ECS. Example: kubernetes keeps short `compromised-sa` in narrative; the join user is the full `system:serviceaccount:default:compromised-sa`.

This is independent of the episode entity catalog (`lib/entities.ts`). Packs are mostly hostless SaaS/cloud audit; Entity Graph for packs is user ↔ IP via `related.*`.

Fixture ids/names stay eval-neutral (`ti-rss-<pack>`, subscription `threat-intel-digest`). They do **not** use `data-generator` branding in document fields.

Environment telemetry is the Technology Watch packs (`logs-okta.system.*`, `logs-aws.cloudtrail.*`, `logs-kubernetes.audit.*`, `logs-github.audit.*`). This path does **not** write `logs-aws.local` or merge with the mustard branch. Generate here, then run mustard Kibana against the same Elasticsearch.

`--threat-intel` with no `--packs` selects all four packs. Use `--alert-mode preview` so pack hunts mint Detection Engine alerts (needed for non-zero Env. hits via `hit_provenance_backfill`).

```bash
# On generate-cli-data-quality (this branch)
yarn data:generate --clean -n 50 --episodes ep1 \
  --threat-intel \
  --alert-mode preview \
  --kibanaUrl http://127.0.0.1:5601/kbn
```

### Mustard demo script (pipeline + Tier 1 / Tier 2 hunts)

Prereqs on mustard ([PR 275243](https://github.com/elastic/kibana/pull/275243) / Phase A from [PR 269002](https://github.com/elastic/kibana/pull/269002)): GenAI connector configured, Agent Builder on the Threat Intelligence skill, and in `config/kibana.dev.yml`:

```yaml
xpack.securitySolution.enableExperimental:
  - threatIntelligenceSkillEnabled
  - iocIndicatorSyncEnabled
```

Restart Kibana after flag changes (`iocIndicatorSyncEnabled` syncs extracted IOCs into threat indicators so Indicator Match / provenance can score Env. hits).

**A. Seed + pipeline (workflows)**

1. Generate once with the command above (packs + TI RSS + preview alerts).
2. Run `threat-intel.source_ingestion` → pending reports from the four `ti-rss-*` sources.
3. Run `threat-intel.nl_extraction_behavioral` → IOCs, behaviors, categories, regions on those reports.
4. Run `threat-intel.digest_delivery` → seeded `threat-intel-digest` subscription produces a digest row.
5. Run `threat-intel.hit_provenance_backfill` → updates `provenance.environment_hits*` from **Detection Engine alerts** (Indicator Match / technique overlap), not from raw pack `logs-*`. Expect non-zero Env. hits after preview alerts + indicator sync.

**B. Tier 1 / Tier 2 hunts (Agent Builder tools from PR 269002)**

These are **not** covered by the digest or provenance workflows. They are skill tools:

| Tool | Tier | What it demos |
| --- | --- | --- |
| `threat_intel.hunt_for_threat` | Tier 1 | Atomic IOC / technique lookup across pack indices + `affected_assets` |
| `threat_intel.hunt_behavior` | Tier 2 | LLM → MITRE-validated behaviors + `proposed_esql_rule` / finding cards |
| `threat_intel.hunt_orchestrated` | Tier 1→2 | One call: environment hits, then behavioral rules grounded on those hits (`tier2_when: on_hits` default) |

After step 3 (extraction), in Agent Builder use topic prompts that force the hunt tools (avoid “give me a digest”, which steers to `search_reports` / digest paths):

6. **Tier 1 only** (expect pack-index hits + users, rarely hosts):
   - *Are we affected by the Okta identity takeover report? Run a forward hunt on its IOCs and list affected users and indices.*
   - Same for AWS IAM / Kubernetes / GitHub supply-chain reports.
   - Expect tool `threat_intel.hunt_for_threat`, status `environment_hits_found`, hits under `logs-okta.*` / `logs-aws.*` / `logs-kubernetes.*` / `logs-github.*`.

7. **Tier 2 only** (expect behaviors + proposed ES\|QL, no env search):
   - *From the Kubernetes service-account escalation report, extract durable ATT&CK behaviors and propose detection rules we should deploy.*
   - Expect `threat_intel.hunt_behavior`, finding cards / `proposed_esql_rule`. Needs GenAI.

8. **Orchestrated Tier 1→2** (main “semantic hunt” beat):
   - *For the AWS IAM privilege-escalation report: hunt our environment for its IOCs, then propose durable behavioral rules informed by what you found. Prioritize what to hunt first.*
   - Expect `threat_intel.hunt_orchestrated` (prefer over manually chaining 6+7). With default `tier2_when: on_hits`, Tier 2 runs only if Tier 1 matched. Check `tier1.status`, `affected_assets`, Tier 2 behaviors, and any `tier2_skipped_reason` (`no_environment_hits` / `no_inference`).

9. **Digest / prioritization** (your original closer, after hunts):
   - *Give me a short threat-intel digest for the last 7 days. What should we prioritize hunting first?*
   - This can use digest/search/synthesize paths; it may **not** call hunt tools. Run 6–8 first if the goal is to show Tier 1/2.

**API fallback** (same bodies as tools): `POST /kbn/api/threat_intelligence/hunt_for_threat`, `.../hunt_behavior`, `.../hunt_orchestrated` with `{ "report_id": "<id>" }` (and optional `tier2_when` on orchestrated).

## CLI arguments

### Data scale + time range

- `-n`, `--events`: Number of **source events** to generate (default: `100`)
- `-h`, `--hosts` / `-u`, `--users`: Entity pool sizes (default: `5`)
- `--start-date` / `--end-date`: Date math window (default: `1d` → `now`)
- `--seed`: Deterministic scaling
- `--clean`: Delete generator-owned episode indices, pack indices (selected `--packs`, or all packs if omitted), matching alerts, pack custom rules, discoveries, cases, and generator TI RSS sources/subscription. With `--alert-mode none`, hunts are deleted and not reinstalled.

### Episodes + packs

- `--episodes`: Default `ep1-ep8,noise1,noise2`
- `--packs`: Comma-separated pack ids (`okta`, `aws-iam`, `kubernetes`, `github-actions`)
- `--fp-count`: `0`–`3` (default `0`); max FP event templates indexed **per hunt** that defines them

### Alerts

- `--alert-mode`: `preview` (default) | `live` | `none`
- `--leave-rules-disabled`: With `live` only, install hunts but leave them disabled
- `--rule-from`: Lookback for installed pack rules (default `now-30d`)
- `--max-preview-invocations`: Cap preview invocations (default `12`)
- `--indexPrefix`: Endpoint index prefix (default `logs-endpoint`; avoid `logs-*-*` patterns in serverless)

### Optional extras

- `--threat-intel`: Per-pack RSS sources + digest subscription for mustard TI workflows (defaults `--packs` to all four when omitted)
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
6. Optional `--threat-intel`: seed per-pack RSS sources + digest subscription
7. Initialize detections / ensure preview index (skipped for `none`)
8. **preview:** honest Rule Preview per producing rule → copy  
   **live:** enable rules for the detection engine (unless `--leave-rules-disabled`)  
   **none:** stop after indexing (+ TI seed if requested)
9. Optional Attack Discoveries / Cases (not for `none`, or live + `--leave-rules-disabled`)

## Out of scope (this PR)

Automated pack sync, Fleet data-stream install, `--alert-density`, rule synthesizer, FortiGate/Exchange packs, Tier 0/A/B upgrades, Discover saved-search install, mustard branch merge, TI eval fixtures (`--threat-intel-evals`), Fleet/real public RSS URLs, `refresh_pack_schema`.

## Troubleshooting

- **Bootstrap / babel errors**: run `yarn kbn bootstrap`
- **0 pack hunt alerts**: check concrete index name vs rule `index`, and that hunt queries match seeded `event.action` vocabulary; logs print per-rule counts
- **Endpoint Security missing**: install Elastic prebuilt rules, then re-run
- **Data-stream template rejects index create**: change `--indexPrefix` (avoid `logs-*-*`)
- **Alerts destination missing**: open Security once / init detections, then re-run
