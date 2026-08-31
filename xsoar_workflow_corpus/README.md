# XSOAR → Kibana workflow gap corpus

Local Node.js (ESM) tool. It is **not** a Kibana plugin. It inventories non-deprecated XSOAR playbooks, classifies conversion gaps (blocker vs non-blocker), and indexes the analysis into local Elasticsearch for a Kibana dashboard.

PM-facing readout of the latest snapshot: [WORKFLOWS_PM_BRIEF.md](./WORKFLOWS_PM_BRIEF.md).

A gap is a **blocker** when it is on the default success path and not optional (`skipunavailable` / `isOptional`). Optional vendor fan-out and off-path branches are non-blockers — the converted workflow can still run without them.

## Dashboard without an XSOAR Packs clone

The branch includes [`xsoar-workflow-seed.zip`](./xsoar-workflow-seed.zip) (~750KB): playbook summary, gap events, and connector frequency. **`ingest` unpacks it automatically** when `corpus/` is empty.

You still need **local Elasticsearch + Kibana 9.5+** (the dashboard is created in your running Kibana, not stored as a saved object in git). You do **not** need the `demisto/content` Packs repo.

```bash
# From the Kibana repo root — local stack
yarn es snapshot
yarn start
```

```bash
cd xsoar_workflow_corpus
npm install --no-workspaces
node --import tsx src/cli.ts ingest
```

Then open [XSOAR Workflow Gap Analysis](http://localhost:5601/app/dashboards#/view/xsoar-workflow-gap-analysis) (time range last 10 years) or search that title in **Dashboards**. Discover data view: `xsoar-workflow-*`.

To refresh **only** the dashboard definition (no re-index):

```bash
node --import tsx src/cli.ts dashboard
```

`ingest` deletes and recreates the analysis indices, so it is safe to re-run. It upserts `PUT /api/dashboards/xsoar-workflow-gap-analysis`. There is no Stack Management import step.

### Environment

| Variable | Default |
| --- | --- |
| `ES_URL` | `http://localhost:9200` |
| `ES_AUTH` | `elastic:changeme` |
| `KIBANA_URL` | `http://localhost:5601` |
| `KIBANA_AUTH` | same as `ES_AUTH` |
| `XSOAR_PACKS_ROOT` | `/Users/agusruidiaz/Documents/Security/content/Packs` (only for `inventory` / `convert`) |

## Rebuild inventory from Packs YAML (optional)

Needed only to refresh numbers from a new content clone, or to emit converted workflow YAML.

```bash
cd xsoar_workflow_corpus
# Packs/ playbook YAML — override default path with XSOAR_PACKS_ROOT
node --import tsx src/cli.ts inventory
node --import tsx src/cli.ts convert --pack Phishing
node --import tsx src/cli.ts all
npm test
```

After `inventory`, regenerate the committed zip from `corpus/` (paths relative to `corpus/`):

```bash
cd corpus
zip -q ../xsoar-workflow-seed.zip \
  inventory/playbooks_summary.json \
  telemetry/gap_events.ndjson \
  analysis/connector_frequency.json \
  analysis/connector_frequency.csv \
  analysis/approval_inventory.csv \
  analysis/presentation_metrics.md
```

## Outputs (`corpus/`, not committed)

Unpacked from the seed zip, or written by `inventory` / `convert`:

- `inventory/playbooks_summary.json` — inventory without per-step arrays (what `ingest` uses from the seed)
- `inventory/playbooks.json` — full inventory including steps (`inventory` only)
- `ir/` / `yaml/` — IR and Kibana workflow YAML (`convert`)
- `analysis/connector_frequency.csv` / `.json`
- `analysis/approval_inventory.csv`
- `analysis/presentation_metrics.md`
- `telemetry/gap_events.ndjson`
