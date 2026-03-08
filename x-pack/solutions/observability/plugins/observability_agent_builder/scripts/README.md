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
npx tsx scripts/ingest_rcaeval.ts                      # list available cases
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
| `--case <name>`         | (none — lists available cases)           | Single case, e.g. `adservice_f4/1`              |
| `--clean`               |                                          | Delete data streams and APM data, then exit     |
| `--source <path>`       | (download)                               | Local RE3-OB directory                          |
| `--otlp-endpoint <url>` | `http://localhost:4318`                  | OTLP endpoint for trace ingestion               |
| `--skip-traces`         |                                          | Skip trace ingestion (no EDOT Collector needed) |
| `--skip-metrics`        |                                          | Skip metric ingestion                           |


### Agent Evaluation

Ingest one case at a time with `--case` (ingesting all 30 mixes unrelated failures into the same 1h window). Each indexed document has `labels.fault_service` and `labels.fault_type` for verification. The `/1`, `/2`, `/3` suffixes are repetitions of the same fault-service pair.

**Fault types** ([RE3-OB dataset](https://github.com/phamquiluan/RCAEval), [paper](https://arxiv.org/html/2412.17015v5)): f1 (incorrect parameter values), f2 (missing parameters), f3 (missing function call), f4 (incorrect return values), f5 (missing exception handlers). In all cases, the root cause service is the service named in the case. Symptoms include stack traces in logs, error response codes in traces, and increased failed requests.

**Prompt**: "Investigate the errors in my system. What service is the root cause and what is causing the failures?"


| Case pattern                   | Root Cause Service | Fault | Expected Root Cause                                                                                                                   |
| ------------------------------ | ------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `cartservice_f1/{1,2,3}`      | `cartservice`      | f1    | Incorrect parameter values — `System.OverflowException` in `RedisCartStore.AddItemAsync` (overflow from extremely large item count)   |
| `currencyservice_f1/{1,2,3}`  | `currencyservice`  | f1    | Incorrect parameter values causing currency conversion errors                                                                         |
| `emailservice_f1/{1,2,3}`     | `emailservice`     | f1    | Incorrect parameter values causing email processing failures                                                                          |
| `emailservice_f2/{1,2,3}`     | `emailservice`     | f2    | Missing parameters in function calls causing runtime errors                                                                           |
| `adservice_f3/{1,2,3}`        | `adservice`        | f3    | Missing function call causing incomplete ad serving and downstream errors                                                             |
| `emailservice_f3/{1,2,3}`     | `emailservice`     | f3    | Missing function call causing incomplete email processing                                                                             |
| `adservice_f4/{1,2,3}`        | `adservice`        | f4    | Incorrect return values causing downstream errors in `frontend`                                                                       |
| `emailservice_f4/{1,2,3}`     | `emailservice`     | f4    | Incorrect return values causing downstream failures                                                                                   |
| `adservice_f5/{1,2,3}`        | `adservice`        | f5    | Missing exception handler causing unhandled crashes, errors propagating to callers                                                    |
| `emailservice_f5/{1,2,3}`     | `emailservice`     | f5    | Missing exception handler causing unhandled crashes, errors propagating to callers                                                    |


Run without `--case` to discover all 30 available case names.

## OpenRCA

`ingest_openrca.ts` downloads the [OpenRCA](https://github.com/microsoft/OpenRCA) benchmark dataset (Bank and Market systems) and ingests logs, traces, and metrics. The dataset contains real telemetry from microservice failure scenarios with ground-truth root causes. CSV files are streamed to avoid memory issues with the multi-GB Market logs.

```bash
npx tsx scripts/ingest_openrca.ts                                            # list available cases
npx tsx scripts/ingest_openrca.ts --case bank/2021_03_04                     # ingest a single case (all signals)
npx tsx scripts/ingest_openrca.ts --case market/2022_03_20
npx tsx scripts/ingest_openrca.ts --case bank/2021_03_04 --skip-traces --skip-metrics  # logs only
npx tsx scripts/ingest_openrca.ts --clean                                    # delete ingested data
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
| `--clean`               |                                          | Delete all OpenRCA data streams and APM data    |
| `--source <path>`       | (download)                               | Local OpenRCA directory                         |
| `--otlp-endpoint <url>` | `http://localhost:4318`                  | OTLP endpoint for trace ingestion               |
| `--skip-traces`         |                                          | Skip trace ingestion (no EDOT Collector needed) |
| `--skip-metrics`        |                                          | Skip metric ingestion                           |


### Agent Evaluation

Each case is a separate failure scenario with its own root causes. Ingest one case at a time (ingesting all cases mixes unrelated failures into the same 1h window). Timestamps are remapped to "last hour", so don't reference original dates in the prompt. The script prints ground-truth tasks after ingestion. Full ground truth is in `datasets/openrca/Bank/query.csv` and `Market/cloudbed-*/query.csv`.

**Prompt**: "Analyze the logs and identify which components are experiencing failures and what is causing them."


| Case                | Faults | Key Root Causes (representative, not exhaustive)                                                                                |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `bank/2021_03_04`   | ~11    | `Mysql02` (high memory), `Redis02` (high memory, high CPU), `Tomcat02` (network latency), `MG01`/`MG02` (JVM OOM, high CPU)    |
| `bank/2021_03_06`   | ~11    | `Tomcat01` (high memory, network latency), `Tomcat03`/`Tomcat04` (network latency, high CPU), `apache02` (packet loss)          |
| `bank/2021_03_07`   | ~14    | `MG02` (packet loss), `Tomcat01` (packet loss, disk I/O, high CPU), `Tomcat02` (network latency, JVM OOM), `apache02` (latency) |
| `bank/2021_03_09`   | ~19    | `apache01` (packet loss, latency, disk I/O), `Tomcat01`/`Tomcat02` (latency, packet loss), `MG02` (packet loss, latency)        |
| `bank/2021_03_10`   | ~15    | `apache02` (latency, packet loss, disk I/O), `Tomcat01` (packet loss, latency, disk I/O), `Tomcat02` (disk I/O, JVM OOM)        |
| `bank/2021_03_12`   | ~11    | `MG01`/`MG02` (packet loss), `Tomcat01`/`Tomcat03` (packet loss), `Redis01`/`Redis02` (high CPU), `Mysql01` (high memory)       |
| `bank/2021_03_23`   | ~10    | `MG01` (packet loss, latency, disk I/O), `MG02` (latency, packet loss), `Tomcat01` (high memory), `Tomcat04` (packet loss)      |
| `bank/2021_03_24`   | ~8     | `Tomcat01` (packet loss, high CPU), `Tomcat02`/`Tomcat03` (latency, packet loss), `MG01`/`MG02` (latency, disk I/O)             |
| `bank/2021_03_25`   | ~18    | `MG01`/`MG02` (latency, packet loss, disk I/O), `Tomcat01`/`Tomcat03` (packet loss, disk I/O), `apache01` (packet loss)         |
| `market/2022_03_20` | ~62    | Across both cloudbeds: container I/O, CPU, memory, network, and process faults on services and nodes                            |
| `market/2022_03_21` | ~81    | Across both cloudbeds: container I/O, CPU, memory, network, and process faults on services and nodes                            |


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

