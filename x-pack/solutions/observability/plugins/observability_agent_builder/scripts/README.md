# Ingestion Scripts

Scripts for downloading and ingesting observability datasets (logs, traces, metrics) into a local Elasticsearch instance. Useful for validating observability agents and tools against realistic failure data.

## Prerequisites

- **Elasticsearch** running at `http://elastic:changeme@localhost:9200`
- **Kibana** running at `http://elastic:changeme@localhost:5601`
- **EDOT Collector** (required for trace ingestion): `node scripts/edot_collector.js`

The EDOT Collector receives traces via OTLP, enriches them with the Elastic APM processor, and produces APM data (transactions, spans, metrics) in Elasticsearch. Without it, trace ingestion is skipped.

## Signal Types and Agent Tools

Each dataset contains three signal types. Each signal populates different Elasticsearch indices consumed by different agent tools:


| Signal  | ES Indices                    | Agent Tools                                                               |
| ------- | ----------------------------- | ------------------------------------------------------------------------- |
| Logs    | `logs-{dataset}.`*            | `get_logs`, `get_log_groups`, `run_log_rate_analysis`                     |
| Traces  | `traces-apm*`, `metrics-apm*` | `get_traces`, `get_trace_metrics`, `get_services`, `get_service_topology` |
| Metrics | `metrics-{dataset}.*`         | `get_hosts`, `get_metric_change_points`                                   |


## RCAEval RE3-OB

`ingest_rcaeval.ts` downloads the [RCAEval RE3-OB](https://github.com/phamquiluan/RCAEval) dataset and ingests logs, traces, and metrics. The dataset contains 30 failure cases from the Online Boutique microservice system with real stack traces and code-level faults.

```bash
npx tsx scripts/ingest_rcaeval.ts                      # ingest all cases (logs + traces + metrics)
npx tsx scripts/ingest_rcaeval.ts --case adservice_f4/1 # ingest a single case
npx tsx scripts/ingest_rcaeval.ts --skip-traces --skip-metrics  # logs only (no EDOT Collector needed)
npx tsx scripts/ingest_rcaeval.ts --clean               # delete ingested data
```

The dataset (~178 MB) is downloaded once and cached in `../datasets/`. Timestamps are remapped into a recent 1-hour window so the data works with default time ranges.

### Data Streams


| Signal  | Data Stream                   |
| ------- | ----------------------------- |
| Logs    | `logs-rcaeval.re3-default`    |
| Traces  | `traces-apm*`, `metrics-apm*` |
| Metrics | `metrics-rcaeval.re3-default` |


### Options


| Flag                    | Default                                  | Description                                     |
| ----------------------- | ---------------------------------------- | ----------------------------------------------- |
| `--es-url <url>`        | `http://elastic:changeme@localhost:9200` | Elasticsearch URL                               |
| `--window <duration>`   | `1h`                                     | Time window to remap timestamps into            |
| `--case <name>`         | all                                      | Single case, e.g. `adservice_f4/1`              |
| `--clean`               |                                          | Delete data streams and exit (no ingestion)     |
| `--source <path>`       | (download)                               | Local RE3-OB directory                          |
| `--otlp-endpoint <url>` | `http://localhost:4318`                  | OTLP endpoint for trace ingestion               |
| `--skip-traces`         |                                          | Skip trace ingestion (no EDOT Collector needed) |
| `--skip-metrics`        |                                          | Skip metric ingestion                           |


### Agent Evaluation

Ingest one case at a time with `--case` (ingesting all 30 mixes unrelated failures into the same 1h window). The fault types are: f1 (incorrect parameter values), f2 (missing parameters), f3 (missing function call), f4 (incorrect return values), f5 (missing exception handlers). Each indexed document has `labels.fault_service` and `labels.fault_type` for verification.

**Prompt**: "Investigate the errors in my system. What service is the root cause and what is causing the failures?"


| Case                      | Expected Root Cause                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `--case cartservice_f1/1` | `cartservice` — stack traces with `System.OverflowException` in `RedisCartStore.AddItemAsync` (incorrect parameter values) |
| `--case adservice_f4/1`   | `adservice` — incorrect return values causing downstream errors in `frontend`                                              |
| `--case <service>_f5/<n>` | `<service>` — unhandled exceptions crashing the service, errors propagating to callers                                     |


Run without `--case` to discover all 30 available case names.

## OpenRCA

`ingest_openrca.ts` downloads the [OpenRCA](https://github.com/microsoft/OpenRCA) benchmark dataset (Bank and Market systems) and ingests logs, traces, and metrics. The dataset contains real telemetry from microservice failure scenarios with ground-truth root causes. CSV files are streamed to avoid memory issues with the multi-GB Market logs.

```bash
npx tsx scripts/ingest_openrca.ts                          # list available cases
npx tsx scripts/ingest_openrca.ts --case bank/2021_03_04   # ingest a single case (all signals)
npx tsx scripts/ingest_openrca.ts --case market/2022_03_20
npx tsx scripts/ingest_openrca.ts --skip-traces --skip-metrics  # logs only
npx tsx scripts/ingest_openrca.ts --clean                  # delete ingested data
```

The dataset (~5 GB) is downloaded once from Google Drive and cached in `../datasets/openrca/`. Timestamps are remapped into a recent 1-hour window so the data works with default time ranges.

### Data Streams


| Signal  | Data Stream                             |
| ------- | --------------------------------------- |
| Logs    | `logs-openrca.{bank,market}-default`    |
| Traces  | `traces-apm*`, `metrics-apm*`           |
| Metrics | `metrics-openrca.{bank,market}-default` |


### Options


| Flag                    | Default                                  | Description                                     |
| ----------------------- | ---------------------------------------- | ----------------------------------------------- |
| `--case <system/date>`  | (none — lists available cases)           | Case to ingest, e.g. `bank/2021_03_04`          |
| `--es-url <url>`        | `http://elastic:changeme@localhost:9200` | Elasticsearch URL                               |
| `--clean`               |                                          | Delete all OpenRCA data streams and exit        |
| `--source <path>`       | (download)                               | Local OpenRCA directory                         |
| `--otlp-endpoint <url>` | `http://localhost:4318`                  | OTLP endpoint for trace ingestion               |
| `--skip-traces`         |                                          | Skip trace ingestion (no EDOT Collector needed) |
| `--skip-metrics`        |                                          | Skip metric ingestion                           |


### Agent Evaluation

Each case is a separate failure scenario with its own root causes. Ingest one case at a time (ingesting all cases mixes unrelated failures into the same 1h window). Timestamps are remapped to "last hour", so don't reference original dates in the prompt. The script prints ground-truth tasks after ingestion. Full ground truth is in `datasets/openrca/Bank/query.csv` and `Market/cloudbed-*/query.csv`.

**Prompt**: "Analyze the logs and identify which components are experiencing failures and what is causing them."


| Case                       | Expected Root Causes                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `--case bank/2021_03_04`   | `Mysql02` (high memory usage), `Redis02` (high memory usage), `Tomcat02` (network latency)     |
| `--case bank/2021_03_06`   | `Tomcat01` (high memory usage), `Tomcat03` (network latency), `apache02` (network packet loss) |
| `--case market/2022_03_20` | `shippingservice-1` (container read I/O load), `node-1` (node memory consumption)              |


Run without `--case` to discover all available case names.

## Verification

After ingestion, verify data is queryable by the agent tools:

```bash
# Verify traces
curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"tool_id":"observability.get_traces","tool_params":{"start":"now-1h","end":"now"}}'

# Verify trace metrics (latency, throughput, failure rate)
curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"tool_id":"observability.get_trace_metrics","tool_params":{"start":"now-1h","end":"now"}}'

# Verify services discovered
curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"tool_id":"observability.get_services","tool_params":{"start":"now-1h","end":"now"}}'
```

Check ES directly:

```bash
# APM traces (generated by EDOT Collector from OTLP)
curl -s "http://elastic:changeme@localhost:9200/traces-apm*/_count" | jq .count

# APM metrics (generated by elasticapm connector)
curl -s "http://elastic:changeme@localhost:9200/metrics-apm*/_count" | jq .count

# Infrastructure metrics
curl -s "http://elastic:changeme@localhost:9200/metrics-openrca*,metrics-rcaeval*/_count" | jq .count
```

