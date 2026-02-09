# Security Solution Data Generator (`generate.ts`)

This directory contains a **fast, lightweight** data generator for Elastic Security development/testing.

It generates:

- **Realistic raw endpoint events** and **endpoint alerts** by replaying + scaling vendored “attack episodes”
- **Full-fidelity Security detection alerts** by running the **Detection Engine Rule Preview** API and copying preview alerts into the real alerts index
- **Optional synthetic Attack Discoveries (no LLM)** built from the generated Security alerts, time-aligned to the requested date range (enable with `--attacks`)
  - Generated via **Kibana APIs** (Elastic Assistant dev-only route), not by directly bulk-indexing raw alert documents

## What’s “realistic” about it?

Instead of inventing ECS docs from scratch, this generator **starts from real episode NDJSON** (captured telemetry) and then:

- **Time-shifts** events into the requested `--start-date` → `--end-date` window
- **Clones** episodes to reach `-n/--events` while rewriting common identity fields (host/user/agent/process IDs) to avoid collisions
- **Concentrates risk** on a small subset of “risky” hosts/users (by default) while still producing background noise across the remaining hosts/users
- **Interleaves alert timestamps** across rules (when copying preview alerts) so alerts don’t appear in big rule-by-rule blocks in the UI

Episode fixtures live here:

- `x-pack/solutions/security/plugins/security_solution/scripts/data/episodes/attacks/`
- `x-pack/solutions/security/plugins/security_solution/scripts/data/episodes/noise/` (false positives / benign-but-suspicious)

## Provenance & sanitization (vendored artifacts)

The episode fixture files under `scripts/data/episodes/**` are **vendored artifacts** intended to make Security development/testing **fast and deterministic** without requiring external downloads.

- **Stability**: these fixtures are expected to **rarely (if ever) change**.
  - **Do not update casually**. Any change to these files can invalidate assumptions in demos, docs, and debugging workflows.
- **Sanitization**: fixtures should contain **no sensitive or customer-identifying data**.
  - Hostnames/users/IDs in the source telemetry should be **synthetic or anonymized**.
  - When in doubt, treat fixture updates as a security review item and get confirmation that the data is safe to redistribute in-repo.

## How alerts are generated (“true Security detection alerts”)

This script uses the **Rule Preview** API:

- `POST /api/detection_engine/rules/preview` (API version `2023-10-31`)

Preview writes alerts into:

- `.preview.alerts-security.alerts-<spaceId>`

The generator then copies those canonical alert docs into:

- `.alerts-security.alerts-<spaceId>`

This produces alerts that look/behave like real detections (full `kibana.alert.*` schema).

### Alert attribution + timestamp interleaving

The generator runs rule preview and then rewrites `kibana.alert.rule.*` so alerts are attributed to **real installed+enabled rules** (a set of 15 prebuilt rules, unique by title).

To avoid alerts appearing in large grouped blocks per rule (a common artifact of batch generation), the generator also applies a deterministic per-alert timestamp “jitter” (within your requested time window) while copying preview alerts into `.alerts-security.alerts-<spaceId>`.

## Requirements / Prereqs

- **Kibana + Elasticsearch running**
- **Dependencies installed** in the repo (e.g. `yarn kbn bootstrap`)
- **Security Solution detections initialized** (recommended)
  - The script will initialize detections by calling `POST /api/detection_engine/index`.
  - If `.alerts-security.alerts-<spaceId>` does not exist yet, the script will **still index raw events/endpoint alerts**, but will **skip generating/copying Security alerts** and log a warning.
- **Privileges** (only required for alerts / attacks / cases)
  - **Raw indexing only** (always attempted): write privileges for the concrete indices created by this script (see “What the script does” below)
  - **Security alerts**: call Detection Engine APIs + read `.preview.alerts-security.alerts-*` + write to `.alerts-security.alerts-*`
  - **Attack Discoveries / Cases**: access to the Elastic Assistant data generator routes + Cases APIs

## Usage

From Kibana repo root:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/data/generate_cli.js \
  -n 100 -h 5 -u 5 \
  --start-date 1d --end-date now
```

To also generate synthetic Attack Discoveries (and optionally cases):

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/data/generate_cli.js \
  -n 100 -h 5 -u 5 \
  --start-date 1d --end-date now \
  --attacks
```

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/data/generate_cli.js \
  -n 100 -h 5 -u 5 \
  --start-date 1d --end-date now \
  --cases
```

## CLI arguments

### Data scale + time range

- `-n`, `--events`: Number of **source events** to generate (default: `100`)
- `-h`, `--hosts`: Number of hosts to distribute activity across (default: `5`)
- `-u`, `--users`: Number of users to distribute activity across (default: `5`)
- `--clean`: Delete previously generated data created by this script before generating new data (default: `false`)
  - Removes:
    - the episode indices created by this script for the selected `--episodes` (across the requested date range)
      - `${indexPrefix}.events.*.<YYYY.MM.DD>`, `${indexPrefix}.alerts.*.<YYYY.MM.DD>`, `insights-alerts-*-<YYYY.MM.DD>`
    - generated Security alerts in `.alerts-security.alerts-<spaceId>`
      - prefers deleting alerts tagged `data-generator`
      - falls back to deleting alerts matching the resolved prebuilt rule UUIDs / `rule_id`s (for older generator runs)
      - note: Security alert deletion is not time-filtered (to avoid leaving generator-owned docs behind due to timestamp jitter)
    - Attack Discoveries created by this script (Synthetic (no-LLM)) from:
      - `.alerts-security.attack.discovery.alerts-<spaceId>` (current)
      - `.adhoc.alerts-security.attack.discovery.alerts-<spaceId>` (legacy; best-effort cleanup)
    - Cases created by this script (tagged `data-generator`, plus a narrow legacy fallback)
  - Notes:
    - **Does not delete** preview indices. Some dev setups won’t automatically recreate preview indices once deleted.
    - Before previewing, the generator clears existing preview documents (to avoid 409 conflicts) without deleting the preview index.
    - If preview indices are missing, the generator will **recreate them** by cloning mappings from the real Security alerts backing index (requires detections to be initialized).
- `--start-date`: Date math start (default: `1d`)
  - Accepts `now-1d` style date math, and a shorthand like `1d` (treated as `now-1d`)
- `--end-date`: Date math end (default: `now`)

### Episode selection

- `--episodes`: Comma-separated list of episode IDs (default: `ep1-ep8,noise1,noise2`)
  - Examples:
    - `--episodes ep1,ep2,ep3`
    - `--episodes 1,2,3` (numbers auto-expand to `epN`)

### Rules

- `--indexPrefix`: Prefix for the endpoint event/alert indices created by this script (default: `logs-endpoint`)
  - If your cluster has templates/data streams that conflict with creating concrete indices under `logs-endpoint.*`, set this to something else (e.g. `security-solution-data-gen`).
  - **Serverless / API key note**: avoid prefixes that match `logs-*-*` (for example `logs-endpoint-generator`), because Elasticsearch can reject creating concrete indices that match data-stream-only templates. Prefer something like `logs-endpoint_generator`, or keep the default `logs-endpoint`.

### Reproducibility

- `--seed`: Optional seed string used to make cloning/host-user assignment deterministic

### Performance / speed

Rule preview can be the slowest step for large time ranges (e.g. `--start-date 60d`) because it runs multiple executor invocations per rule.

- `--max-preview-invocations`: Caps rule preview invocations per rule (lower is faster). Default: `12`
- `--skip-alerts`: Skip rule preview + copying alerts entirely (raw event/endpoint alert indexing only)
- `--skip-alerts` also skips Attack Discoveries / Cases (because they depend on Security alerts)
- `--skip-ruleset-preview`: Skip previews of the selected prebuilt rules (baseline attribution only; faster)
- `--attacks`: Generate synthetic Attack Discoveries (**opt-in**)
- `--cases`: Create Kibana cases from **~50%** of generated Attack Discoveries (**implies `--attacks`**)
  - Creates a case per selected discovery and attaches:
    - a markdown summary comment
    - all discovery alert IDs as alert attachments (from `.alerts-security.alerts-<spaceId>`)
  - The case title is set to the generated Attack Discovery title.
  - Backdates **Created on** (`created_at`) to a deterministic time within **0–12 hours after** the discovery timestamp.
    - `updated_at` is intentionally not modified, so **Updated on** reflects real runtime activity (attachments, edits, etc.).

### Kibana/Elasticsearch connection

- `--kibanaUrl` (default: `http://127.0.0.1:5601`)
- `--elasticsearchUrl` (default: `http://127.0.0.1:9200`)
- `--username` (default: `elastic`)
- `--password` (default: `changeme`)
- `--apiKey`: Elasticsearch API key (base64, with or without `ApiKey ` prefix). When provided, the script uses API key auth for both Kibana + Elasticsearch.
  - You can also set `ES_API_KEY` (or `ELASTIC_API_KEY`) instead of passing `--apiKey`.
- `--spaceId` (optional; defaults to `default`)

## What the script does (high level)

1. **Connects to Kibana + Elasticsearch** and logs basic connectivity details.
2. **Installs prebuilt rules** if missing (non-blocking)
   - On a fresh Kibana (0 prebuilt rules installed), it installs **15 prebuilt Elastic rules** (unique by title) to keep the demo environment consistent and avoid confusing duplicate titles.
   - If prebuilt rules are already installed, it does not uninstall or expand the install set.
3. Loads vendored episode fixtures from `episodes/attacks/` and `episodes/noise/` (supports `.ndjson` and `.ndjson.gz`)
4. **Scales** episodes (time-shift + clone + rewrite IDs)
5. Indexes into concrete indices (UTC-day suffix `YYYY.MM.DD`):
   - endpoint events:
     - `epN` episodes: `${indexPrefix}.events.insights.epN.<YYYY.MM.DD>`
     - other episode ids: `${indexPrefix}.events.<episode>.<YYYY.MM.DD>`
   - endpoint alerts:
     - `epN` episodes: `${indexPrefix}.alerts.insights.epN.<YYYY.MM.DD>`
     - other episode ids: `${indexPrefix}.alerts.<episode>.<YYYY.MM.DD>`
   - a copy of endpoint alerts into `insights-alerts-<episode>-<YYYY.MM.DD>` (for the Insights-style baseline)
6. **Initializes detections** (so `.alerts-security.alerts-<spaceId>` exists)
7. Ensures the selected prebuilt rules are **enabled**
8. Ensures the preview alerts index exists and **clears existing preview documents** (without deleting the index)
9. If `--skip-alerts` is set, stops after raw indexing.
10. If `.alerts-security.alerts-<spaceId>` doesn’t exist yet, stops after raw indexing (with a warning).
11. Runs Rule Preview and copies preview alerts into `.alerts-security.alerts-<spaceId>`:

- Baseline: runs a single Insights-style preview once, then **copies/attributes** the resulting preview alerts across the selected prebuilt rules
- Optional: previews each selected prebuilt rule directly (skippable with `--skip-ruleset-preview`)
- While copying, alert IDs are namespaced per target rule and `kibana.alert.rule.*` is rewritten so alerts are attributed to **real installed+enabled rules**
- Alert timestamps are deterministically jittered within the requested time range so alerts interleave across rules in time-sorted views

12. Optionally (with `--attacks`, or `--cases`) creates **synthetic Attack Discoveries (no LLM)** from generated Security alerts

- Discoveries are created via Kibana (dev-only) API:
  - `POST /internal/elastic_assistant/data_generator/attack_discoveries/_create`
- Under the hood, Kibana persists them using the **Alerting framework** into:
  - `.alerts-security.attack.discovery.alerts-<spaceId>`
- The generator ensures generated discoveries are **backdated** so `@timestamp` / `kibana.alert.start` fall within the requested `--start-date` → `--end-date` range.
- Discoveries focus on a small set of “risky” host/user pairs (top alert volume), not every entity

13. Optionally (with `--cases`) creates cases from ~50% of generated Attack Discoveries (tagged `data-generator`)

## Troubleshooting

- **“Cannot find module @babel/…”**:
  - Your `node_modules` are incomplete/out of date. Run `yarn kbn bootstrap`.
- **Prebuilt rule install fails**:
  - This usually means Kibana can’t reach EPR or Fleet isn’t ready. Install prebuilt rules manually in the Security app and re-run.
- **Security alerts destination missing (`.alerts-security.alerts-<spaceId>`)**:
  - Open the Security app once and initialize detections, or run detections initialization via the API, then re-run. Raw data indexing should still succeed even if alerts are skipped.
- **Elasticsearch rejects index creation with data stream template errors**:
  - Use a different `--indexPrefix` that does not match data-stream-only templates (avoid `logs-*-*` patterns like `logs-endpoint-generator`).
- **No alerts created / no matches**:
  - Ensure your rule’s index patterns match the indices being populated and that the time range overlaps.
  - The baseline Insights-style preview depends on the `insights-alerts-*` indices (the generator writes these for you).
