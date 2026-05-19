# ES|QL Profile Harness — `profile_logs_extraction.js`

Runs the entity-store logs-extraction query against one or two Elasticsearch clusters
with `?profile=true` and stores, per run, the exact query, the raw profile JSON, and a
generated analysis comparing the run against the baseline and the immediately previous run.

This is the measurement tool for the iterative ES|QL optimisation work (GitHub issue
elastic/kibana#269259). Each optimisation iteration is one commit; the commit body
should include the per-operator CPU delta printed by this script.

## Prerequisites

- Node.js 18+ (the monorepo default is Node 24 — `nvm use 24.14.1`)
- A running Elasticsearch cluster with entity-store data (logs in `logs-*`, a
  `.entities.v2.latest.*` index present for the LOOKUP JOIN)
- From the Kibana monorepo root: `yarn kbn bootstrap` already run

## Environment variables (credentials — never committed)

| Variable | Cluster | Purpose |
|---|---|---|
| `ES_LOCAL_USERNAME` | local | Basic-auth username (default: `elastic`) |
| `ES_LOCAL_PASSWORD` | local | Basic-auth password (default: `changeme`) |
| `ES_REMOTE_URL` | remote | Full cluster URL, e.g. `https://…elastic-cloud.com` |
| `ES_REMOTE_API_KEY` | remote | API key string (sent as `Authorization: ApiKey …`) |

Set them in your shell before running. Do **not** add them to any tracked file.

```bash
export ES_LOCAL_USERNAME=elastic
export ES_LOCAL_PASSWORD=changeme

# Remote cluster (replace with actual values from 1Password / team vault):
export ES_REMOTE_URL=https://<cluster-id>.es.<region>.gcp.elastic-cloud.com
export ES_REMOTE_API_KEY=<base64-api-key>
```

## Usage

Run from the Kibana monorepo root:

```bash
nvm use 24.14.1
node x-pack/solutions/security/plugins/entity_store/scripts/profile_logs_extraction.js \
  [options]
```

### Options

| Flag | Default | Description |
|---|---|---|
| `--cluster` | `both` | `local`, `remote`, or `both` |
| `--entity` | `user,host,generic,service` | Comma-separated entity types to profile |
| `--from` | `now-1d` | Start of the time window (ISO or `now-Xd/h/m/s`) |
| `--to` | `now` | End of the time window |
| `--run-id` | ISO timestamp | Label for this run; becomes the top-level folder name under `profiles/` |
| `--namespace` | `default` | Kibana space namespace (used to build the latest-index name) |
| `--docs-limit` | `10000` | `LIMIT` clause value passed to the query builder |
| `--index-patterns` | `logs-*,.entities.v2.updates*` | Comma-separated source index patterns. The updates data stream is included by default because it carries the full entity-store ECS field mappings, which are required for schema validation. |

### Standard matrix (run before each optimisation commit)

```bash
node x-pack/solutions/security/plugins/entity_store/scripts/profile_logs_extraction.js \
  --cluster both \
  --entity user,host,generic,service \
  --from "now-1d" --to "now" \
  --run-id baseline
```

Replace `baseline` with `iter1-hoist-ok`, `iter2-coalesce-concat`, etc. for subsequent
iterations.

## Output layout

All output lives under `profiles/` in the plugin root. **This folder is gitignored.**

```
profiles/
  baseline/
    local/
      user/
        query.esql       ← exact ES|QL sent to the cluster
        profile.json     ← raw profile block from the response
        analysis.md      ← per-operator breakdown + delta vs baseline / prev run
      host/   { … }
      generic/{ … }
      service/{ … }
    remote/
      user/   { … }
      …
  iter1-hoist-ok/
    local/
      user/
        query.esql
        profile.json
        analysis.md      ← compares vs profiles/baseline/local/user/profile.json
                           and the previous run (most recent folder before iter1-hoist-ok)
      …
```

## Analysis file format

Each `analysis.md` contains:

1. **Operators (current run)** — table of all operators sorted by `cpu_nanos` descending.
2. **Delta vs baseline** — per-operator CPU delta sorted by absolute change. Only present
   when a baseline profile exists for the same cluster+entity combination.
3. **Delta vs previous run** — same but against the most recent prior run. Only present
   when a prior run exists and differs from the baseline.

The total operator CPU delta is printed at the bottom of each delta section.

## Reading the commit body

Each optimisation commit includes a snippet like:

```
Before (driver 3, user entity): CaseLazyEvaluator cpu_nanos = 13.6s
After                         : CaseLazyEvaluator cpu_nanos = 1.2s
Delta                         : -12.4s (-91%)
Source: profiles/iter1-hoist-ok/remote/user/analysis.md
```

The full `analysis.md` is not committed (it's gitignored) but is available locally for
the iteration being reviewed.
