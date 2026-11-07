# es_archives/k8s_deployment

This README sits outside the archive folder because esArchiver parses every file in it as JSON.

Hand-written, not recorded from a generator run. The OpenTelemetry Kubernetes generator from the
benchmarking repo was not available when the Scout suite was added, and the `types` route reads no
data, so a minimal archive is enough for now. It seeds the later `_list` and `_count` specs.

Contents: two data streams and one time-series index. Three deployments (`checkout/cart-api`,
`checkout/payments`, `platform/ingress`) in cluster `scout-cluster`, two timestamps each
(`2026-11-01T10:00:00Z` and `2026-11-01T10:01:00Z`).

- `metrics-kubernetes.state_deployment-default`: Elastic Agent names (`orchestrator.cluster.name`,
  `kubernetes.namespace`, `kubernetes.deployment.*`, `kubernetes.labels.app`) and
  `metricset.name: state_deployment`.
- `metrics-k8sclusterreceiver.otel-default`: OpenTelemetry names (`k8s.cluster.name`,
  `k8s.namespace.name`, `k8s.deployment.name`, `k8s.deployment.uid`, `k8s.deployment.available`,
  `k8s.deployment.desired`).

Only the fields used by `server/definitions/kubernetes/k8s_deployment.ts` are mapped, with
`dynamic: false`.

Time-series case, in namespace `streaming` on 2026-11-05, apart from the windows of the other
`list.spec.ts` cases:

- `metrics-k8sclusterreceiver.otel-tsds`: a plain time-series index (`index.mode: time_series`), not a
  data stream. A time-series data stream sets its time bounds around the current time when it is
  created and rejects fixed archive timestamps; a plain index takes explicit
  `index.time_series.start_time`/`end_time` (2026-11-05 here), so the archive stays loadable.
  `tsds-shared` (newer values) and `tsds-only`. It does not map `k8s.deployment.uid`, although its
  documents carry it, so the `TS` plan reports `resource_id` in `unavailableColumns` and `tsds-only`
  has a null `resource_id`.
- `metrics-k8sclusterreceiver.otel-default`: `tsds-shared` (older values) and `standard-only`.

Elasticsearch refuses a regular index whose name matches a template that creates data streams, and
the time-series index sits behind the same source pattern. So the archive's OpenTelemetry data
stream template matches only `metrics-k8sclusterreceiver.otel-default`, and the Scout fixture puts a
higher-priority template without `data_stream` for `metrics-k8sclusterreceiver.otel-tsds` before
loading the archive, which overrides Elasticsearch's built-in `metrics-otel@template`.

TODO: regenerate from the generator (`node scripts/es_archiver.js save`) once it is available, and
record the generator repo, commit, command and time span here.
