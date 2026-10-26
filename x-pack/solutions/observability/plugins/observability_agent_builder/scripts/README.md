# Ingestion Scripts

Scripts for downloading and ingesting observability datasets (logs, traces, metrics) into a local Elasticsearch instance for validating observability agents and tools.

## Prerequisites

- **Elasticsearch** running at `http://elastic:changeme@localhost:9200`
- **Kibana** running at `http://elastic:changeme@localhost:5601`
- **EDOT Collector** for trace ingestion: `node scripts/edot_collector.js` (use `--skip-traces` to skip)

## RCAEval RE3-OB

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

### Data Streams

| Signal  | Data Stream                   |
| ------- | ----------------------------- |
| Logs    | `logs-rcaeval.re3-default`    |
| Traces  | `traces-apm*`, `metrics-apm*` |
| Metrics | `metrics-rcaeval.re3-default` |

### Cases

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

## OpenRCA

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

### Data Streams

| Signal  | Data Stream                             |
| ------- | --------------------------------------- |
| Logs    | `logs-openrca.{bank,market}-default`    |
| Traces  | `traces-apm*`, `metrics-apm*`           |
| Metrics | `metrics-openrca.{bank,market}-default` |

### Cases

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
