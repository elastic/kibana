# es_archives/k8s_deployment

This README sits outside the archive folder because esArchiver parses every file in it as JSON.

Hand-written, not recorded from a generator run. The OpenTelemetry Kubernetes generator from the
benchmarking repo was not available when the Scout suite was added, so the archive is a minimal one
shaped for the `list.spec.ts` cases.

Contents: three data streams, four plain indices and one filtered alias, all in cluster
`scout-cluster`. Each `list.spec.ts` case reads its own time window, so the cases do not see each
other's documents.

Only the fields used by `server/definitions/kubernetes/k8s_deployment.ts` are mapped, with
`dynamic: false`. Every OpenTelemetry mapping (the data stream template and the three plain
OpenTelemetry indices) carries the ECS<->OTel aliases the definition relies on: `kubernetes.namespace` over
`k8s.namespace.name`, `kubernetes.deployment.name` over `k8s.deployment.name` and
`orchestrator.cluster.name` over `k8s.cluster.name`, as the real OTel integration templates do.
No index maps `k8s.deployment.uid`, although every OpenTelemetry document carries it, so the
`k8s.deployment.uid` column has no type, every row has it `null`, and both OpenTelemetry plans
(`TS` and `FROM`) report it in `unavailableColumns`.

## Indices

- `metrics-kubernetes.state_deployment-default` (data stream): Elastic Agent names
  (`orchestrator.cluster.name`, `kubernetes.namespace`, `kubernetes.deployment.*`,
  `kubernetes.labels.app`) and `metricset.name: state_deployment`. Supplies
  `k8s.deployment.available` via `last` of `kubernetes.deployment.replicas.available`.
- `metrics-kubernetes.state_container-default` (data stream): Elastic Agent container state
  (`kubernetes.namespace`, `kubernetes.deployment.name`, `kubernetes.container.name`) and
  `metricset.name: state_container`, with no restarts. The definition
  has a single source for the Elastic Agent integration, with index pattern `metrics-kubernetes.*`.
  It matches this stream and `state_deployment`, and its filter keeps only documents whose
  `metricset.name` is `state_deployment` or `state_container`. It declares restarts as
  `sum_increase` (`SUM(INCREASE)`, the field is a counter), which only `TS` can compute, so the
  `FROM` plan lists it in `unsupportedMetrics[]` and restarts are `null` on rows only `FROM` reads.
  `kubernetes.container.status.restarts` is mapped only in `metrics-kubernetes.state_container_ts-tsds`,
  as a counter. ES|QL resolves a field's type across every index the pattern matches before
  `_index_mode` excludes any, so a plain `long` here too would make every query of the Agent source
  fail with a type conflict in windows that reach both indices.
- `metrics-k8sclusterreceiver.otel-default` (data stream): OpenTelemetry names (`k8s.cluster.name`,
  `k8s.namespace.name`, `k8s.deployment.name`, `k8s.deployment.available`,
  `k8s.deployment.desired`, `k8s.container.restarts`). Restarts use `sum_delta` (`SUM(DELTA)`, the
  field is a gauge), `TS` only as well, so restarts are `null` on rows this stream supplies.
- `metrics-k8sclusterreceiver.otel-tsds`: a plain time-series index (`index.mode: time_series`), not a
  data stream, with the same OpenTelemetry names. A time-series data stream sets its time bounds
  around the current time when it is created and rejects fixed archive timestamps; a plain index
  takes explicit `index.time_series.start_time`/`end_time` (2026-11-05 here), so the archive stays
  loadable. Restarts is a gauge (`time_series_metric: gauge`); the dimensions are cluster, namespace
  and deployment name, so each deployment is one time series.
- `metrics-kubernetes.state_container_ts-tsds`: a plain time-series index (bounds on 2026-11-09) with
  the Elastic Agent names, built like the OpenTelemetry one. Its name matches the Agent source
  pattern `metrics-kubernetes.*` but not the archive's `metrics-kubernetes.state_container-*` data
  stream template, so the Agent source gets a `TS` plan in every window. It maps
  `kubernetes.container.status.restarts` as a counter (`time_series_metric: counter`, as in the real
  integration) and `orchestrator.cluster.name`, `kubernetes.namespace`, `kubernetes.deployment.name`
  and `kubernetes.container.name` as dimensions (one time series per container). It also maps the
  `state_deployment` fields the source reads (replicas as gauges, `paused`, `labels.app`), with no
  values, so the Agent `TS` plan reports no unavailable column; its documents are all
  `metricset.name: state_container`.
- `entity-inventory-scout-aliased-standard` (standard) and `entity-inventory-scout-aliased-tsds`
  (time series, bounds on 2026-11-07): OpenTelemetry names. Their own names match no source
  pattern; both are reached only through the alias `metrics-k8sclusterreceiver.otel-filtered`,
  which matches `metrics-k8sclusterreceiver.otel-*` and filters on
  `k8s.deployment.name` in (`kept-standard`, `kept-tsds`).

## Metric samples

available and desired are the `last` sample inside the window. restarts is the change inside the window: `SUM(INCREASE)` of the
Agent counter, `SUM(DELTA)` of the OpenTelemetry gauge, both `TS` only and summed over a
deployment's time series. It is `null` on rows only a `FROM` plan reads, and on a time series with a
single sample in the window (both functions need two).

| Window | Entity | Read by | Restarts samples | available | restarts |
| --- | --- | --- | --- | --- | --- |
| 2026-11-01 10:01 | checkout/cart-api | `FROM` | 4, 5 | 3 | `null` |
| 2026-11-01 10:01 | checkout/payments | `FROM` | 1, 1 | 2 | `null` |
| 2026-11-01 10:01 | platform/ingress | `FROM` | 0, 0 | 1 | `null` |
| 2026-11-05 10:01 | streaming/tsds-shared | `FROM` and `TS` | 10 (data stream), 12 (tsds) | 5 | `null` |
| 2026-11-05 10:00 | streaming/standard-only | `FROM` | 3 | 1 | `null` |
| 2026-11-05 10:00 | streaming/tsds-only | `TS` | 7 | 2 | `null` |
| 2026-11-05 14:01 | timeseries/ts-window | `TS` | 6, 8 | 2 | 2 |
| 2026-11-05 16:02 | gauges/restarts-drop | `TS` | 9, 9, 4 | 1 (samples 2, 2, 1; `max` would be 2) | -5 |
| 2026-11-07 10:00 | aliased/kept-standard | `FROM` | 9 | 1 | `null` |
| 2026-11-07 10:00 | aliased/kept-tsds | `TS` | 11 | 2 | `null` |
| 2026-11-09 10:02 | counters/two-containers | `TS` | app 1, 2, 4; sidecar 5, 6, 6 | `null` | 4 |
| 2026-11-09 10:03 | counters/counter-reset | `TS` | app 3, 5, 0, 2 (reset) | `null` | 4 |
| 2026-11-09 10:02 | counters/steady | `TS` | app 7, 7, 7 | `null` | 0 |

Observed on 9.7: without a time bucket, `INCREASE` and `DELTA` return the change between the first
and last samples inside the window, with no extrapolation to the window bounds, as whole numbers
(typed `double`). `INCREASE` reads the drop to 0 as a reset. The 2026-11-09 window cut at
10:01:30 gives two-containers 2, counter-reset 2 and steady 0.

## Windows

- 2026-11-01, 10:00:00 and 10:01:00: three deployments in Agent `state_deployment`, Agent
  `state_container`, and the OpenTelemetry data stream.
- 2026-11-05, 10:00:00 and 10:01:00, namespace `streaming`: `tsds-shared` in the OpenTelemetry data
  stream (10:00:00, older values) and the time-series index (10:01:00, newer values), `tsds-only` in
  the time-series index and `standard-only` in the OpenTelemetry data stream.
- 2026-11-05, 14:00:00 and 14:01:00, namespace `timeseries`: `ts-window` in the time-series index
  only.
- 2026-11-05, 16:00:00 to 16:02:00, namespace `gauges`: `restarts-drop` in the OpenTelemetry
  time-series index only, its restarts gauge dropping from 9 to 4 and its available and desired
  replicas from 2 to 1 (so `last` and `max` differ).
- 2026-11-07, 10:00:00, namespace `aliased`: `kept-standard` and `dropped-standard` in
  `entity-inventory-scout-aliased-standard`, `kept-tsds` and `dropped-tsds` in
  `entity-inventory-scout-aliased-tsds`.
- 2026-11-09, 10:00:00 to 10:03:00, namespace `counters`: `two-containers`, `counter-reset` and
  `steady` in the Agent time-series index only.

## Loading

Elasticsearch refuses a regular index whose name matches a template that creates data streams, and
each time-series index sits behind the same source pattern as a data stream. So the archive's
OpenTelemetry data stream template matches only `metrics-k8sclusterreceiver.otel-default`, the Agent
`state_container` template's `metrics-kubernetes.state_container-*` does not match
`metrics-kubernetes.state_container_ts-tsds`, and the Scout fixture puts a higher-priority template
without `data_stream` for both time-series indices before loading the archive. It overrides
Elasticsearch's built-in `metrics-otel@template` and `metrics` (`metrics-*-*`) templates. The
`entity-inventory-scout-aliased-*` names match no built-in template. esArchiver creates the alias
from the indices' `aliases` key.

The fixture loads with `loadIfNeeded`, which skips an index that already exists. After changing the
archive, delete its data streams, indices, aliases and templates on a running Scout server before
the next run. `node scripts/scout run-tests` starts its own servers on a fresh cluster, so it always
loads the current archive; it fails if a `start-server` stack is already running.

TODO: regenerate from the generator (`node scripts/es_archiver.js save`) once it is available, and
record the generator repo, commit, command and time span here.
