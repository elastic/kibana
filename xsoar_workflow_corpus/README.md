# XSOAR → Kibana workflow gap corpus

Local Node.js (ESM) tool. It is **not** a Kibana plugin. It reads cloned XSOAR content packs, inventories non-deprecated playbooks, converts a pack (default Phishing) to Kibana workflow YAML with gap `console` stubs, and indexes the analysis into local Elasticsearch for a Kibana dashboard.

PM-facing readout of the latest snapshot: [WORKFLOWS_PM_BRIEF.md](./WORKFLOWS_PM_BRIEF.md).

A gap is a **blocker** when it is on the default success path and not optional (`skipunavailable` / `isOptional`). Optional vendor fan-out and off-path branches are non-blockers — the converted workflow can still run without them.

## Prerequisites

1. **Elasticsearch + Kibana 9.5+** (Dashboards API). From the Kibana repo root:

   ```bash
   yarn es snapshot
   yarn start
   ```

   Defaults: Elasticsearch `http://localhost:9200`, Kibana `http://localhost:5601`, user `elastic` / password `changeme`.

2. **XSOAR content clone** with a `Packs/` directory (playbook YAML). Default path is `/Users/agusruidiaz/Documents/Security/content/Packs`. Override with `XSOAR_PACKS_ROOT`.

3. **This folder’s dependencies** (parent Kibana is not this package’s npm workspace):

   ```bash
   cd xsoar_workflow_corpus
   npm install --no-workspaces
   ```

## Seed Elasticsearch and create the dashboard

Generated files land under `corpus/` (gitignored). Re-run these commands whenever playbooks or classification change.

```bash
cd xsoar_workflow_corpus

# 1. Scan Packs/ → inventory JSON, connector CSV, gap NDJSON
node --import tsx src/cli.ts inventory

# 2. Bulk-index into ES, create data view xsoar-workflow-*, upsert the dashboard
node --import tsx src/cli.ts ingest
```

`ingest` deletes and recreates the analysis indices, so it is safe to re-run. It calls the public Dashboards API:

`PUT /api/dashboards/xsoar-workflow-gap-analysis`

There is no extra “import saved objects” step in Stack Management.

To refresh **only** the dashboard definition (same id, no re-index):

```bash
node --import tsx src/cli.ts dashboard
```

### Environment

| Variable | Default |
| --- | --- |
| `XSOAR_PACKS_ROOT` | `/Users/agusruidiaz/Documents/Security/content/Packs` |
| `ES_URL` | `http://localhost:9200` |
| `ES_AUTH` | `elastic:changeme` |
| `KIBANA_URL` | `http://localhost:5601` |
| `KIBANA_AUTH` | same as `ES_AUTH` |

### Other commands

```bash
# Phishing playbooks → IR + Kibana YAML + pack-scoped analysis (includes nested packs)
node --import tsx src/cli.ts convert --pack Phishing

# inventory + convert + ingest
node --import tsx src/cli.ts all

npm test
```

## See the analysis in Kibana

After a successful `ingest`:

1. **Dashboard** — open [XSOAR Workflow Gap Analysis](http://localhost:5601/app/dashboards#/view/xsoar-workflow-gap-analysis)  
   or Kibana → **Dashboards** → search `XSOAR Workflow Gap Analysis`.  
   The saved time range is `now-10y` → `now` so the ingest `@timestamp` is included. If charts are empty, widen the time picker to the last 10 years.

2. **Discover** — data view **`xsoar-workflow-*`** (created by ingest). Indices:

   - `xsoar-workflow-playbooks`
   - `xsoar-workflow-gaps`
   - `xsoar-workflow-connectors`
   - `xsoar-workflow-approvals`

Chart-by-chart interpretation: [WORKFLOWS_PM_BRIEF.md](./WORKFLOWS_PM_BRIEF.md).

## Outputs (`corpus/`, not committed)

- `inventory/playbooks.json` — full inventory for the Workflows team
- `inventory/playbooks_summary.json` — same without per-step arrays
- `ir/` — per-playbook IR (`convert`)
- `yaml/` — Kibana workflow YAML, `enabled: false`, gap `console` steps
- `analysis/connector_frequency.csv` — vendor brands vs Elastic backlog
- `analysis/approval_inventory.csv`
- `analysis/presentation_metrics.md`
- `telemetry/gap_events.ndjson`
