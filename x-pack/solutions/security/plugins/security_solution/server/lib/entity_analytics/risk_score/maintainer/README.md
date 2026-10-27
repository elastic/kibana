# Risk score maintainer instrumentation

Each calculation emits structured info logs for its effective settings, process health,
entity-type summaries, stage timings and aggregate totals. `risk_score.calculationRunId`
connects those records to the scored documents. Entity-type records carry the namespace
and entity type in the same metadata object.

The risk-owned `risk_score_maintainer_performance` telemetry event carries stage measurements
and a process-window report. Each measurement has a fixed name, numeric value and unit.
Step measurements carry a `tags` array such as `["store", "write"]`. Stage names, measurement
names, tags and units come from code. Entity identifiers, page bounds,
queries and configured filters stay in their existing diagnostic paths.

Scheduled executions also attach compact stage summaries to `kibana.task.data` in the Task
Manager event log. `calculationRunId` connects them to calculation logs, performance telemetry
and scored documents. The calculation identity is attached at startup, and each completed stage
updates the snapshot available to cancellation events. Finalization records the terminal status.
The risk-score instrumentation owns the payload and its 3,500-byte
budget, with `omittedStages` accounting for trimmed entries. The maintainer framework passes
through the optional Task Manager callback. Synchronous executions use the same scoring logs
and performance telemetry.

## Timing boundaries

Base and resolution scoring retain their current sequential page execution. Each stage
emits a timing record for every completed page and reports page 1 separately from subsequent
pages in its aggregate summary. Steps cover discovery, member reads,
ES|QL requests, row parsing, entity reads, modifiers, entity creation and both write paths.
Request wall time includes client scheduling, serialization, transport and response decoding.
`esTookMs` is the accumulated duration reported by Elasticsearch for responses that expose it.
The difference includes all of that client-side and transport work.

Timing operations accept tag arrays. Page logs and stage summaries expose `steps` as an array
of tagged totals, and telemetry carries the same tags alongside names such as
`firstPage.steps.ms`. Aggregation sorts and deduplicates tags into a private key, so equivalent
tag sets share one distribution. The tag vocabulary is defined in `page_timing_types.ts`.

Each stage boundary creates and finalizes its collector, sharing it across scoring and
persistence. The maintainer and on-demand recalculation entry points pass their configured
profiling settings and report completed observations on success or failure. HTTP requests and
Agent Builder recalculations use the same configured sampling interval and enablement flag.

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

ES|QL profiling is enabled by default and samples page 1, then every 20 pages throughout
each base and resolution stage: 1, 21, 41, 61, 81, 101, and so on. Configure it with:

```yaml
xpack.securitySolution.entityAnalytics.riskEngine.esqlProfiling: true
xpack.securitySolution.entityAnalytics.riskEngine.esqlProfilingInterval: 20
```

The interval accepts positive whole numbers. An interval of 1 profiles every scoring page.
Setting `esqlProfiling` to `false` disables ES|QL profiling while preserving ordinary page
timings, counters, logs and telemetry.

Each sampled profile is emitted immediately with its page number, query wall time,
Elasticsearch time, row counts and the three busiest operator categories. Every completed
page emits its own step timings and counters. Failed pages are finalized by stage reporting.
Only the current page and fixed-size stage aggregates remain in memory, so retained state
stays bounded for long runs. Profile aggregates count the samples in each page group.

## Module layout

`instrumentation/` contains the page collector, duration histogram, ES|QL profile summarizer,
process-health tracker, run metrics, performance event schema, reporting and task-event sizing.
The collector emits observations; reporting converts summaries into logs and telemetry.
Page contracts live in `page_timing_types.ts`, and percentile estimates come from
`duration_histogram.ts`. Public operations appear before their supporting helpers.

## Validation

Run the maintainer Jest suites and the Entity Store maintainer framework suites separately:

```sh
node scripts/jest --runInBand x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/maintainer
node scripts/jest --runInBand x-pack/platform/plugins/shared/entity_store/server/tasks/entity_maintainers
```

Compare profiling-disabled and enabled full runs using the same dataset and cluster conditions
when evaluating collection overhead. Retain output parity, acknowledged writes, process CPU,
GC, memory and complete-run duration with each comparison.
