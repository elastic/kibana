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

