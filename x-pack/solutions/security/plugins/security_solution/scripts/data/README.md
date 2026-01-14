# Security Solution Data Generator (`generate.ts`)

This directory contains a **fast, lightweight** data generator for Elastic Security development/testing.

It generates:

- **Realistic raw endpoint events** and **endpoint alerts** by replaying + scaling vendored “attack episodes”
- **Full-fidelity Security detection alerts** by running the **Detection Engine Rule Preview** API and copying preview alerts into the real alerts index
- **Synthetic Attack Discoveries (no LLM)** built from the generated Security alerts, time-aligned to the requested date range

## What’s “realistic” about it?

Instead of inventing ECS docs from scratch, this generator **starts from real episode NDJSON** (captured telemetry) and then:

- **Time-shifts** events into the requested `--start-date` → `--end-date` window
- **Clones** episodes to reach `-n/--events` while rewriting common identity fields (host/user/agent/process IDs) to avoid collisions
- **Concentrates risk** on a small subset of “risky” hosts/users (by default) while still producing background noise across the remaining hosts/users
- **Interleaves alert timestamps** across rules (when copying preview alerts) so alerts don’t appear in big rule-by-rule blocks in the UI

Episode fixtures live here:

- `x-pack/solutions/security/plugins/security_solution/scripts/data/episodes/attacks/`
- `x-pack/solutions/security/plugins/security_solution/scripts/data/episodes/noise/` (false positives / benign-but-suspicious)

## How alerts are generated (“true Security detection alerts”)

This script uses the **Rule Preview** API:

- `POST /api/detection_engine/rules/preview` (API version `2023-10-31`)

Preview writes alerts into:

- `.preview.alerts-security.alerts-<spaceId>`

The generator then copies those canonical alert docs into:

- `.alerts-security.alerts-<spaceId>`

This produces alerts that look/behave like real detections (full `kibana.alert.*` schema).

### Alert attribution + timestamp interleaving

The generator runs rule preview and then rewrites `kibana.alert.rule.*` so alerts are attributed to **real installed+enabled rules** (the rules matched by `--ruleset`).

To avoid alerts appearing in large grouped blocks per rule (a common artifact of batch generation), the generator also applies a deterministic per-alert timestamp “jitter” (within your requested time window) while copying preview alerts into `.alerts-security.alerts-<spaceId>`.

## Requirements / Prereqs

- **Kibana + Elasticsearch running**
- **Dependencies installed** in the repo (e.g. `yarn kbn bootstrap`)
- **Security Solution initialized** (so `.alerts-security.alerts-<spaceId>` exists)
  - If you get an error about missing `.alerts-security.alerts-*`, open the Security app once and initialize detections.
- **Privileges**: the user you run with must be able to:
  - call the Detection Engine APIs
  - read preview indices `.preview.alerts-security.alerts-*`
  - write to `.alerts-security.alerts-*`

## Usage

From Kibana repo root:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/data/generate.js \
  -n 100 -h 5 -u 5 \
  --start-date 1d --end-date now
```

## CLI arguments

### Data scale + time range

- `-n`, `--events`: Number of **source events** to generate (default: `100`)
- `-h`, `--hosts`: Number of hosts to distribute activity across (default: `5`)
- `-u`, `--users`: Number of users to distribute activity across (default: `5`)
- `--clean`: Delete previously generated data for the selected time range before generating new data (default: `false`)
  - Removes:
    - the episode indices created by this script for the selected `--episodes` (for the current date suffix)
    - detection alerts in `.alerts-security.alerts-<spaceId>` attributed to the ruleset rules (within the time range)
    - ad-hoc Attack Discoveries created by this script (Synthetic (no-LLM), for the current `--username`, within the time range)
  - Notes:
    - **Does not delete** preview indices. Some dev setups won’t automatically recreate preview indices once deleted.
    - If preview indices are missing, the generator will **recreate them best-effort** by cloning mappings from `.internal.alerts-security.alerts-<spaceId>-000001`.
- `--start-date`: Date math start (default: `1d`)
  - Accepts `now-1d` style date math, and a shorthand like `1d` (treated as `now-1d`)
- `--end-date`: Date math end (default: `now`)

### Episode selection

- `--episodes`: Comma-separated list of episode IDs (default: `ep1-ep8,noise1,noise2`)
  - Examples:
    - `--episodes ep1,ep2,ep3`
    - `--episodes 1,2,3` (numbers auto-expand to `epN`)

### Rules

- `--ruleset`: Path to a YAML ruleset file (default: `x-pack/solutions/security/plugins/security_solution/scripts/data/rulesets/default_ruleset.yml`)
- `--indexPrefix`: Prefix for the endpoint event/alert indices created by this script (default: `logs-endpoint`)
  - If your cluster has templates/data streams that conflict with creating concrete indices under `logs-endpoint.*`, set this to something else (e.g. `security-solution-data-gen`).

Ruleset entries are resolved **best-effort**:

- If a `rule_id` is provided, it must exist (or the entry is skipped in non-strict mode)
- Otherwise, rules are matched by `name_contains_any` tokens against installed rules’ names

### Reproducibility

- `--seed`: Optional seed string used to make cloning/host-user assignment deterministic

### Kibana/Elasticsearch connection

- `--kibanaUrl` (default: `http://127.0.0.1:5601`)
- `--elasticsearchUrl` (default: `http://127.0.0.1:9200`)
- `--username` (default: `elastic`)
- `--password` (default: `changeme`)
- `--spaceId` (optional; defaults to `default`)

## What the script does (high level)

1. **Installs prebuilt rules (best-effort)** if missing
   - On a fresh Kibana (0 prebuilt rules installed), it installs **only the rules matched by `--ruleset`** (not all rules).
   - If prebuilt rules are already installed, it **does not uninstall** existing rules.
2. Loads vendored episode fixtures from `episodes/attacks/`
3. **Scales** episodes (time-shift + clone + rewrite IDs)
4. Indexes:
   - raw endpoint events into `logs-endpoint.events.*`
   - endpoint alerts into `logs-endpoint.alerts-*`
   - a copy of endpoint alerts into `insights-alerts-*` (for the Insights rule)
5. **Enables the ruleset rules**
6. Runs **rule preview** for:
   - a baseline Insights-style query (to ensure detections are generated from the endpoint alert fixtures)
   - any rules resolved from `--ruleset`
7. Copies preview alerts into `.alerts-security.alerts-<spaceId>` and rewrites `kibana.alert.rule.*` so alerts are attributed to **real installed+enabled rules**
   - While copying, alert timestamps are **jittered within the requested time range** so alerts are interleaved across rules in time-sorted views
8. Creates **synthetic Attack Discoveries (no LLM)** and indexes them into:
   - `.internal.adhoc.alerts-security.attack.discovery.alerts-<spaceId>-000001`
   - Attack Discoveries are generated only for a small set of “risky” entities (top host/user pairs by alert volume), not for every host/user

## Troubleshooting

- **“Cannot find module @babel/…”**:
  - Your `node_modules` are incomplete/out of date. Run `yarn kbn bootstrap`.
- **Prebuilt rule install fails**:
  - This usually means Kibana can’t reach EPR or Fleet isn’t ready. Install prebuilt rules manually in the Security app and re-run.
- **No alerts created from preview**:
  - Ensure your rule’s index patterns match the indices being populated and that the time range overlaps.
  - The vendored Insights rule expects `insights-alerts-*` (the generator writes that for you).
