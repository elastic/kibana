# es_archives/k8s_deployment

This README sits outside the archive folder because esArchiver parses every file in it as JSON.

Hand-written, not recorded from a generator run. The OpenTelemetry Kubernetes generator from the
benchmarking repo was not available when the Scout suite was added, and the `types` route reads no
data, so a minimal archive is enough for now. It seeds the later `_list` and `_count` specs.

Contents: two data streams, three deployments (`checkout/cart-api`, `checkout/payments`,
`platform/ingress`) in cluster `scout-cluster`, two timestamps each (`2026-11-01T10:00:00Z` and
`2026-11-01T10:01:00Z`).

- `metrics-kubernetes.state_deployment-default`: Elastic Agent names (`orchestrator.cluster.name`,
  `kubernetes.namespace`, `kubernetes.deployment.*`, `kubernetes.labels.app`) and
  `metricset.name: state_deployment`.
- `metrics-k8sclusterreceiver.otel-default`: OpenTelemetry names (`k8s.cluster.name`,
  `k8s.namespace.name`, `k8s.deployment.name`, `k8s.deployment.uid`, `k8s.deployment.available`,
  `k8s.deployment.desired`).

Only the fields used by `server/definitions/kubernetes/k8s_deployment.ts` are mapped, with
`dynamic: false`.

Both data streams are standard. The time-series case is not archived: a time-series data stream
accepts only documents near the current time, so `api/tests/list_time_series.spec.ts` writes its
own time-series data stream behind `metrics-k8sclusterreceiver.otel-*` with current timestamps and
deletes it afterwards.

TODO: regenerate from the generator (`node scripts/es_archiver.js save`) once it is available, and
record the generator repo, commit, command and time span here.
