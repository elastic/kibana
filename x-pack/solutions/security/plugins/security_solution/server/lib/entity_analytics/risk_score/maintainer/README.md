# Risk score maintainer instrumentation

Each calculation emits structured info logs for its effective settings, process health,
entity-type summaries, stage timings and aggregate totals. `risk_score.calculationRunId`
connects those records to the scored documents. Entity-type records carry the namespace
and entity type in the same metadata object.

The `entity_maintainer_run_summary` telemetry event carries stage measurements and a
process-window report. Each measurement has a fixed name, numeric value and unit.
Stage names, measurement names and units come from code. Entity identifiers, page bounds,
queries and configured filters stay in their existing diagnostic paths.

Scheduled executions also attach compact scope, funnel and stage summaries to
`kibana.task.data` in the Task Manager event log. Its `runId` matches framework telemetry;
`calculationRunId` connects each scoring summary to the calculation logs. The custom
payload has a 3,500-byte budget and reports `omittedSummaries` when trimming is needed.
Synchronous executions use the same scoring logs and framework telemetry.

## Timing boundaries

Base and resolution scoring retain their current sequential page execution. Each stage
reports page 1 separately from subsequent pages. Steps cover discovery, member reads,
ES|QL requests, row parsing, entity reads, modifiers, entity creation and both write paths.
Request wall time includes client scheduling, serialization, transport and response decoding.
`esTookMs` is the accumulated duration reported by Elasticsearch for responses that expose it.
The difference includes all of that client-side and transport work.

Step summaries contain call counts, failures, total duration, maximum duration and p50/p95
estimates. Failed operations contribute elapsed time and preserve their original errors.
Percentiles describe individual step invocations. A fixed 256-bucket histogram uses eight
buckets per doubling of `(milliseconds + 1)`; percentile values use the bucket upper bound,
capped by the observed maximum. Memory stays bounded as page counts grow. Discovery of an
empty terminal page contributes its request time and zero scored pages.

Counters expose partial ES|QL responses, member-filter fallback, modifier-fetch failures,
and acknowledged and failed writes. Completed writes remain observable when a subsequent
operation fails. These observations preserve existing scoring and fallback behavior.

## Process health

CPU, event-loop utilization and delay, GC activity, heap, RSS, external memory and array-buffer
measurements describe the shared Kibana process during the calculation window. Other tasks,
requests and plugins contribute to them. Memory peaks are sampled every second and at run
boundaries; short spikes can fall between samples. Array buffers form part of external memory.

The tracker records concurrent calculations at start and measures background load between
non-overlapping calculations. A finalizer disconnects observers and timers on completion or
failure. Cancellation reaches the finalizer through the existing scoring cancellation paths.

## ES|QL profiles

Enable diagnostic sampling with:

```yaml
xpack.securitySolution.entityAnalytics.riskEngine.esqlProfiling: true
```

The default is disabled. Enabled calculations profile pages 1, 21, 41, 61 and 81 of each
base and resolution stage. The stage log contains up to five condensed profiles, including
query wall time, Elasticsearch time, row counts and the three busiest operator categories.
Sampling concentrates on the beginning of each stage. Ordinary timing, response and failure
counters cover every observed page independently of this setting.

## Validation

Run the maintainer Jest suites and the Entity Store maintainer framework suites separately:

```sh
node scripts/jest --runInBand x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/maintainer
node scripts/jest --runInBand x-pack/platform/plugins/shared/entity_store/server/tasks/entity_maintainers
```

Compare profiling-disabled and enabled full runs using the same dataset and cluster conditions
when evaluating collection overhead. Retain output parity, acknowledged writes, process CPU,
GC, memory and complete-run duration with each comparison.
