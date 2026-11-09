# es_archives/k8s_deployment

This README sits outside the archive folder because esArchiver parses every file in it as JSON.

Hand-written, not recorded from a generator run. The OpenTelemetry Kubernetes generator from the
benchmarking repo was not available when the Scout suite was added, so the archive is a minimal one
shaped for the `list.spec.ts` cases.

Contents: two data streams, three plain indices and one filtered alias, all in cluster
`scout-cluster`. Each `list.spec.ts` case reads its own time window, so the cases do not see each
other's documents.

Only the fields used by `server/definitions/kubernetes/k8s_deployment.ts` are mapped, with
`dynamic: false`. Every OpenTelemetry mapping (the data stream template and the three plain
indices) carries the ECS<->OTel aliases the definition relies on: `kubernetes.namespace` over
`k8s.namespace.name`, `kubernetes.deployment.name` over `k8s.deployment.name` and
`orchestrator.cluster.name` over `k8s.cluster.name`, as the real OTel integration templates do.
No index maps `k8s.deployment.uid`, although every OpenTelemetry document carries it, so the
`k8s.deployment.uid` column has no type, every row has it `null`, and both OpenTelemetry plans
(`TS` and `FROM`) report it in `unavailableColumns`.

## Indices

- `metrics-kubernetes.state_deployment-default` (data stream): Elastic Agent names
  (`orchestrator.cluster.name`, `kubernetes.namespace`, `kubernetes.deployment.*`,
  `kubernetes.labels.app`) and `metricset.name: state_deployment`.
- `metrics-k8sclusterreceiver.otel-default` (data stream): OpenTelemetry names (`k8s.cluster.name`,
  `k8s.namespace.name`, `k8s.deployment.name`, `k8s.deployment.available`,
  `k8s.deployment.desired`).
- `metrics-k8sclusterreceiver.otel-tsds`: a plain time-series index (`index.mode: time_series`), not a
  data stream, with the same OpenTelemetry names. A time-series data stream sets its time bounds
  around the current time when it is created and rejects fixed archive timestamps; a plain index
  takes explicit `index.time_series.start_time`/`end_time` (2026-11-05 here), so the archive stays
  loadable.
- `entity-inventory-scout-aliased-standard` (standard) and `entity-inventory-scout-aliased-tsds`
  (time series, bounds on 2026-11-07): OpenTelemetry names. Their own names match no source
  pattern; both are reached only through the alias `metrics-k8sclusterreceiver.otel-filtered`,
  which matches `metrics-k8sclusterreceiver.otel-*` and filters on
  `k8s.deployment.name` in (`kept-standard`, `kept-tsds`).

## Windows

- 2026-11-01, 10:00:00 and 10:01:00: three deployments (`checkout/cart-api`, `checkout/payments`,
  `platform/ingress`) in both data streams, with the same values.
- 2026-11-05, 10:00:00 and 10:01:00, namespace `streaming`: `tsds-shared` in the OpenTelemetry data
  stream (10:00:00, older values) and the time-series index (10:01:00, newer values), `tsds-only` in
  the time-series index and `standard-only` in the OpenTelemetry data stream.
- 2026-11-05, 14:00:00 and 14:01:00, namespace `timeseries`: `ts-window` in the time-series index
  only.
- 2026-11-07, 10:00:00, namespace `aliased`: `kept-standard` and `dropped-standard` in
  `entity-inventory-scout-aliased-standard`, `kept-tsds` and `dropped-tsds` in
  `entity-inventory-scout-aliased-tsds`.

## Loading

Elasticsearch refuses a regular index whose name matches a template that creates data streams, and
the time-series index sits behind the same source pattern. So the archive's OpenTelemetry data
stream template matches only `metrics-k8sclusterreceiver.otel-default`, and the Scout fixture puts a
higher-priority template without `data_stream` for `metrics-k8sclusterreceiver.otel-tsds` before
loading the archive, which overrides Elasticsearch's built-in `metrics-otel@template`. The
`entity-inventory-scout-aliased-*` names match no built-in template. esArchiver creates the alias
from the indices' `aliases` key.

The fixture loads with `loadIfNeeded`, which skips an index that already exists. After changing the
archive, delete its data streams, indices and templates on a running Scout server before the next
run.

TODO: regenerate from the generator (`node scripts/es_archiver.js save`) once it is available, and
record the generator repo, commit, command and time span here.
