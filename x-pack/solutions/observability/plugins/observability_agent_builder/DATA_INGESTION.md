# Data Ingestion

How to ingest observability data (logs, traces, metrics) into a local Elasticsearch instance for validating tools, agents, and AI insights.

There are three main ingestion methods:

| Method | Best for | Data source |
| --- | --- | --- |
| [Ingestion Scripts](#1-ingestion-scripts-rcaeval-and-openrca) | Real-world failure scenarios with known root causes for agent evaluation | Pre-recorded datasets (RCAEval, OpenRCA) |
| [Synthtrace Scenarios](#2-synthtrace-scenarios) | Deterministic test data for individual tool development and API integration tests | Programmatically generated synthetic data |
| [OpenTelemetry Demo](#3-opentelemetry-demo) | End-to-end testing with live microservices and feature-flag-driven failure injection | Live microservice application (~28 containers) |

---

## 1. Ingestion Scripts (RCAEval and OpenRCA)

Scripts for downloading and ingesting observability datasets into a local Elasticsearch instance. Run all commands from `x-pack/solutions/observability/plugins/observability_agent_builder/`.

### Prerequisites

- **Elasticsearch** running at `http://elastic:changeme@localhost:9200`
- **Kibana** running at `http://elastic:changeme@localhost:5601`
- **EDOT Collector** for trace ingestion: `node scripts/edot_collector.js` (use `--skip-traces` to skip)

### RCAEval RE3-OB

30 code-level failure cases from the Online Boutique microservice system. Source: [RCAEval RE3-OB](https://github.com/phamquiluan/RCAEval) ([paper](https://arxiv.org/html/2412.17015v5)).

```bash
 # list available cases
npx tsx scripts/ingest_rcaeval.ts

# ingest a single case
npx tsx scripts/ingest_rcaeval.ts --case adservice_f4/1

# limit trace rows for faster ingestion
npx tsx scripts/ingest_rcaeval.ts --case adservice_f4/1 --max-trace-rows 50000

# clean then ingest
npx tsx scripts/ingest_rcaeval.ts --clean --case adservice_f4/1

# delete ingested data
npx tsx scripts/ingest_rcaeval.ts --clean
```

#### Data Streams

| Signal  | Data Stream                   |
| ------- | ----------------------------- |
| Logs    | `logs-rcaeval.re3-default`    |
| Traces  | `traces-apm*`, `metrics-apm*` |
| Metrics | `metrics-rcaeval.re3-default` |

#### Cases

Fault types: f1 (incorrect parameter values), f2 (missing parameters), f3 (missing function call), f4 (incorrect return values), f5 (missing exception handlers). The `/1`, `/2`, `/3` suffixes are repetitions of the same fault-service pair.

| Case pattern                 | Root Cause Service | Fault | Expected Root Cause                                                                                                                 |
| ---------------------------- | ------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `cartservice_f1/{1,2,3}`     | `cartservice`      | f1    | Incorrect parameter values — `System.OverflowException` in `RedisCartStore.AddItemAsync` (overflow from extremely large item count) |
| `currencyservice_f1/{1,2,3}` | `currencyservice`  | f1    | Incorrect parameter values causing currency conversion errors                                                                       |
| `emailservice_f1/{1,2,3}`    | `emailservice`     | f1    | Incorrect parameter values causing email processing failures                                                                        |
| `emailservice_f2/{1,2,3}`    | `emailservice`     | f2    | Missing parameters in function calls causing runtime errors                                                                         |
| `adservice_f3/{1,2,3}`       | `adservice`        | f3    | Missing function call causing incomplete ad serving and downstream errors                                                           |
| `emailservice_f3/{1,2,3}`    | `emailservice`     | f3    | Missing function call causing incomplete email processing                                                                           |
| `adservice_f4/{1,2,3}`       | `adservice`        | f4    | Incorrect return values causing downstream errors in `frontend`                                                                     |
| `emailservice_f4/{1,2,3}`    | `emailservice`     | f4    | Incorrect return values causing downstream failures                                                                                 |
| `adservice_f5/{1,2,3}`       | `adservice`        | f5    | Missing exception handler causing unhandled crashes, errors propagating to callers                                                  |
| `emailservice_f5/{1,2,3}`    | `emailservice`     | f5    | Missing exception handler causing unhandled crashes, errors propagating to callers                                                  |

### OpenRCA

Real telemetry from microservice failure scenarios across Bank and Market systems. Source: [OpenRCA](https://github.com/microsoft/OpenRCA). Full ground truth is in `datasets/openrca/Bank/query.csv` and `Market/cloudbed-*/query.csv`.

```bash
# list available cases
npx tsx scripts/ingest_openrca.ts

# ingest a single case
npx tsx scripts/ingest_openrca.ts --case bank/2021_03_04

# limit trace rows for faster ingestion (bank has 12M+ trace rows)
npx tsx scripts/ingest_openrca.ts --case bank/2021_03_04 --max-trace-rows 200000

# clean then ingest
npx tsx scripts/ingest_openrca.ts --clean --case bank/2021_03_04

# delete ingested data
npx tsx scripts/ingest_openrca.ts --clean
```

#### Data Streams

| Signal  | Data Stream                             |
| ------- | --------------------------------------- |
| Logs    | `logs-openrca.{bank,market}-default`    |
| Traces  | `traces-apm*`, `metrics-apm*`           |
| Metrics | `metrics-openrca.{bank,market}-default` |

#### Cases

| Case                | Faults | Key Root Causes (representative, not exhaustive)                                                                                |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `bank/2021_03_04`   | ~11    | `Mysql02` (high memory), `Redis02` (high memory, high CPU), `Tomcat02` (network latency), `MG01`/`MG02` (JVM OOM, high CPU)     |
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

---

## 2. Synthtrace Scenarios

Every tool MUST have a Synthtrace scenario. Scenarios live in `src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/`.

Run a scenario with:

```bash
node scripts/synthtrace \
  src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/<tool_name>/<scenario>.ts \
  --from "now-1h" --to "now" --clean
```

See the [Synthtrace Scenarios AGENTS.md](../../../../../src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/AGENTS.md) for detailed guidelines on writing scenarios.

---

## 3. OpenTelemetry Demo

The [OpenTelemetry Demo](https://github.com/elastic/opentelemetry-demo) is a microservices application that generates realistic Observability data (traces, logs, metrics) and supports feature flags to simulate various failure scenarios. Use it to validate the Observability Agent and individual tools against real-world-like incidents.

### Starting the OTel Demo

Clone the repo and start the demo, configured to send data to your local Elasticsearch:

```bash
cd /path/to/opentelemetry-demo

# Create an API key for the demo
API_KEY=$(curl -s -X POST "http://localhost:9200/_security/api_key" \
  -u elastic:changeme \
  -H "Content-Type: application/json" \
  -d '{ "name": "opentelemetry-demo" }' | jq -r .encoded)

sed -i '' -E "s|^ELASTICSEARCH_ENDPOINT=.*|ELASTICSEARCH_ENDPOINT=\"http://host.docker.internal:9200\"|" .env.override
sed -i '' -E "s|^ELASTICSEARCH_API_KEY=.*|ELASTICSEARCH_API_KEY=$API_KEY|" .env.override

# Start all services
make start
```

This starts ~28 Docker containers. Wait for all containers to be healthy before proceeding. The demo sends data to the local Elasticsearch instance at `localhost:9200`.

### Feature Flags

Feature flags are configured via the `flagd` service. Edit the file:

```
/path/to/opentelemetry-demo/src/flagd/demo.flagd.json
```

Flagd watches this file for changes — edits take effect automatically (no restart needed).

To enable a flag, change its `defaultVariant` from `"off"` to `"on"` (or to a specific variant for flags with multiple levels):

```json
"paymentUnreachable": {
  "defaultVariant": "on",
  ...
}
```

To disable a flag, set `defaultVariant` back to `"off"`.

Full list of available feature flags: [https://opentelemetry.io/docs/demo/feature-flags/](https://opentelemetry.io/docs/demo/feature-flags/)

### Wait for Data Accumulation

After enabling feature flags and cleaning data, **wait at least 10 minutes** before running an investigation. This ensures enough metric rollups and trace data have been generated for meaningful analysis.

When running the investigation tool, use a lookback window that matches the wait time:

```bash
curl -s --max-time 600 -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool_id": "observability.get_log_groups",
    "tool_params": { "start": "now-10m", "end": "now" }
  }'
```

### Full Test Workflow

```
1. Start OTel demo:
See "Starting the OTel Demo" above

2. Clean APM data:
Delete data streams — see "Cleaning Observability Data" below

3. Enable feature flag(s):
Edit demo.flagd.json

4. Wait 10 minutes:
`sleep 600`

5. Verify that expected data scenario is available in Elasticsearch
Example: `curl http://elastic:changeme@localhost:9200/_search`

6. Run investigation:
Example: `curl ... get_log_groups with start=now-10m`

7. Review results
8. Review Phoenix Traces (if available)
9. Disable feature flag(s): Reset defaultVariant to "off"
10. Repeat from step 2 for next scenario
```

### Resetting All Feature Flags

After testing, reset all flags to `"off"` by setting each `defaultVariant` back to `"off"` in `demo.flagd.json`. Verify no flags are accidentally left enabled — leftover flags cause confusing results in subsequent tests.

---

## Cleaning Observability Data

Delete all observability data streams (APM, OTel, logs, infrastructure metrics, synthetics) to avoid stale data polluting results:

```bash
curl -s -X DELETE "http://elastic:changeme@localhost:9200/_data_stream/traces-apm*,metrics-apm*,logs-apm*,metrics-*.otel*,traces-*.otel*,logs-*.otel*,logs-*-*,metrics-system*,metrics-kubernetes*,metrics-docker*,metrics-aws*,synthetics-*-*" | jq .
```

Verify that all data streams are gone:

```bash
curl -s "http://elastic:changeme@localhost:9200/_data_stream/*apm*,*otel*,logs-*,metrics-*,synthetics-*" | jq '[.data_streams[] | .name]'
# Expected: []
```
