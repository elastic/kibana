# Hosts UI Performance Investigation

> **Editor's note (post-PoC).** This document is the **pre-PoC** forensic investigation — captured before any prototype code was written, with `getAllHosts` framed as the dominant cost and the four KPI tiles as a smaller secondary win (item #4 of 7 in the TL;DR below). The PoC's deploy-side measurements on a real 5000-host cluster **flipped that priority**: the host table is not the user-perceived bottleneck on a loaded Hosts page, the **KPI strip is** — its four parallel Lens/DSL queries dominate the wall by roughly two orders of magnitude on TSDS-backed semconv data. The architectural argument here still stands and the table is still expensive in absolute terms, but if you're reading this looking for "what we actually shipped and why", start with the [PoC outcomes comment](https://github.com/elastic/observability-dev/issues/5590#issuecomment-4563528163) and [`PROPOSALS.md`](./PROPOSALS.md). This report is kept verbatim as the empirical input behind the proposals.

**Status:** Draft. Server-side analysis complete. Local HAR + Inspector captured.
**Scope:** Kibana Infra Hosts view (`/app/metrics/hosts`) at scale (≥500 hosts).
**Repro:** Local Kibana + ES (9.5.0 snapshot) with 1500 OTel hosts ingested via synthtrace `infra_hosts_semconv`, ~25h of `host.name`-bearing OTel metrics in `metrics-hostmetricsreceiver.otel-default`. A parallel ECS run (system.* via metricbeat) was used for cross-schema sanity checks.

**Schema scope.** All the perf problems documented here exist on **both** schemas (`semconv` and `ecs`). The numbers in the matrix below are from the semconv fixture because (a) that's the higher-ground bug — semconv adds a per-state aggregation multiplier on top of the same architectural costs ECS has — and (b) it's where the original complaint was filed. Where a finding is genuinely schema-specific (e.g. the `state`-breakdown sub-agg multiplier in §"Why the metric sub-aggs are so expensive") it is called out explicitly. Every other root cause — the 500-cap, the `top_metrics` metadata cost, the `OR`-of-`match_phrase` KPI filter, the duplicate first-paint fetches, the `monitoredHosts` duplicate bucket, the unbounded count endpoint, the Lens fan-out — is schema-agnostic and benefits ECS users by the same proportion or more (ECS has fewer sub-aggs, so the *non-metric* costs dominate even sooner on ECS).

---

## TL;DR

The dominant cost in the Hosts UI is **one Elasticsearch aggregation** — the `getAllHosts` query that fires for every page load and every limit/range change. None of the root causes are unique to one schema; semconv just amplifies the metric-agg row in the table below. Specifically:

1. The **per-host metric sub-aggregations are 80–90% of the cost.** This is the one finding where schema *does* matter: ECS metrics are mostly single-field `avg`/`sum` aggs (cheap), while semconv (OTel) requires nested `terms` aggs on `state` + `sum_bucket` + `bucket_script` per metric. Five metrics × multiple sub-aggs × N host buckets compounds — see §"Why the metric sub-aggs are so expensive" for the per-metric breakdown across both schemas.
2. The **3 `top_metrics` sub-aggs** for `host.os.name` / `cloud.provider` / `host.ip` add another ~30% and run for every host on every page load — those fields are essentially static metadata. We experimented with replacing them: `terms(size:1)` is 24 % cheaper but its "most-frequent value" semantic breaks the metadata-exclusion path (a mid-window AWS→GCP migration would still materialise as `aws`), and the compromise shape `terms(size:1, order:{latest_ts:desc}) > max(@timestamp)` turned out to be **slower** than the original, not faster (full table in §"Why we kept top_metrics for host metadata"). The cost driver is therefore the per-bucket invocation count (`limit × 3 top_metrics`), not the shape itself. **Both schemas pay this cost equally** (the three fields exist verbatim in both `ecs` and `semconv` documents).
3. The query **scales linearly with both `limit` and time range** in the worst-case combination. At local-cluster speeds (M2, 1 shard, fast SSD) we see **5.0s ES `took` at limit=500 / 24h** on semconv. The same query in Serverless takes 8+ minutes per Ty's measurements, dominated by storage / shard fan-out. **Both schemas suffer this scaling profile**; semconv just starts higher on the y-axis.
4. After the table loads, **4 KPI Lens charts** fan out using an `OR`-of-up-to-500 `match_phrase` filters on `host.name`. On 500/24h each KPI costs ~400ms locally; using a flat `terms` filter would save ~30–40%. Multiply by 4 parallel KPIs. **Schema-agnostic** — KPI filtering is the same shape in both schemas.
5. The total fleet `host count` endpoint runs with `MAX_HOST_COUNT_LIMIT = 10000` and returns every host bucket every time — at 1500 hosts this adds another ~500ms at 24h. **Schema-agnostic.**
6. The Kibana data-fetcher pipeline **fires the heavy endpoints twice on first paint** (once with default schema/data-view, once with the resolved values), wasting ~800 ms of ES work per page load on the local fixture. **Schema-agnostic.**
7. **Correctness gaps discovered en route, independent of perf.** Three structural issues in the host-loading pipeline silently desynchronise what the user sees from what's actually in the cluster: (a) the 500-cap drops the lexicographic tail of metric-bearing hosts with no signal beyond a "Limited to N" hint; (b) APM-only hosts are counted by `/host/count` (`2300` on our 1500-infra + 800-APM fixture) but never reach the table because `getAllHosts`'s `terms` agg only buckets hosts with infra-metric docs; (c) the alerts query has two independent alphabetic truncations on top of Phase B's (Modes A and B in §"Ordering across the whole pipeline"). These don't make the page slower, but they make it less correct — and any architectural fix to the perf pipeline must close them at the same time, otherwise lifting caps just moves the silent failures. **Schema-agnostic.**

There are no client-side rendering issues at this scale (1500 rows is well within EUI table capacity). The product is **slow because we ask Elasticsearch to do too much in a single query**, and on first paint we ask twice.

---

## Measurement matrix (local cluster, median of 3 warm runs, ES `took_ms`)

### Main `getAllHosts` query — full vs. ablation variants

| variant                 | 100 / 1h | 500 / 1h | 100 / 24h | 500 / 24h |
| ----------------------- | -------: | -------: | --------: | --------: |
| **full (production)**   |    **316** | **385**  | **1054**  | **5001**  |
| no `top_metrics` (drop 3 metadata aggs) | 231 | 286 | 737 | 3552 |
| no `monitoredHosts` (drop system-integration branch) | 245 | 295 | 902 | 4274 |
| no metric sub-aggs (just `top_metrics` + terms) | 18 | 52 | 167 | 582 |
| bare `terms` (host.name buckets only) | 15 | 17 | 87 | 200 |

Phase A (`getFilteredHostNames`) is independent and runs in **~50ms at 1h, ~500ms at 24h** regardless of `limit` (it scans all 1500 host buckets to pick the top-N).

Phase B response sizes: **283 KB** at 100 hosts → **1.41 MB** at 500 hosts (linear in `limit`).

### Decomposing the 500 / 24h worst case (5001 ms)

From an ES `profile=true` run at limit=500 / 1h (where individual sub-agg times are visible):

| Component                            | Time (limit=500, 1h) | Share |
| ------------------------------------ | -------------------: | ----: |
| Root `terms` on `host.name`          |               384 ms |   ~64% of root |
| 3 × `top_metrics` for metadata       |        ~348 ms total |   ~58% of root |
| `monitoredHosts` filter+terms branch |                99 ms |   ~16% |
| semconv metric sub-aggs (cpu/mem/disk `terms` on `state`) | ~290 ms total | ~48% |

(Aggregations run in parallel per shard, so individual `time_in_nanos` values sum to more than the wall-clock `took`. The relative weights are still informative.)

Applied to the 500 / 24h case: dropping the metric sub-aggs alone takes us from **5001 ms → 582 ms** (an **88% reduction**); dropping the 3 `top_metrics` takes us from **5001 ms → 3552 ms** (a **29% reduction**) — but only if you accept a "most-frequent value" semantic, which is wrong for hosts that change metadata mid-window. See the dedicated ablation below for why we ultimately did **not** bank this win.

#### Why we kept `top_metrics` for host metadata (3-way ablation)

After the initial ablation showed `terms(size:1)` was 24 % faster at 500/24h, we designed a "best of both worlds" shape `terms(size:1, order:{latest_ts:desc}) > max(@timestamp)` that preserves the "latest non-null" semantic and benchmarked all three against the same fixture (500 hosts, cold cache, anchored to the dataset's max `@timestamp`):

| Shape | Semantic | 1h `took` | 6h `took` | 24h `took` | Bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `filter:{exists} > top_metrics(latest, size:1)` (original, kept) | latest non-null | 87 ms | 416 ms | 1603 ms | ~210 KB |
| `terms(size:1)` | most-frequent non-null | 75 ms | 380 ms | 1228 ms (**−24 %**) | ~200 KB |
| `terms(size:1, order:{latest_ts:desc}) > max(@timestamp)` | latest non-null | 131 ms | 484 ms | 1758 ms (**+10 %**) | ~322 KB |

The compromise shape is **slower than the original** — the `max(@timestamp)` sub-agg has to evaluate per value bucket, ordering a `terms` agg by a metric sub-agg forces a second pass, and ES carries the `latest_ts` value through to the response (~110 KB of extra payload at 500 hosts). So in DSL there is no shape that's both cheaper than `top_metrics` and preserves the "latest non-null" semantic.

The semantic matters because the metadata value is consumed by the post-fetch exclusion filter in [`get_hosts.ts:72-82`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts.ts). If we returned the *most-frequent* value, a host that migrated from AWS to GCP mid-window would still materialise as `cloud.provider = aws` (history wins the frequency contest), and a `cloud.provider != aws` exclusion would drop the host even though the user would intuitively expect it kept. That's a worse regression than the cost win is worth.

**Status:** the production code keeps `top_metrics` (no DSL replacement has been found that's both cheaper and semantically correct). The cost driver is the per-bucket invocation count, not the shape. Ablation script is preserved at `/tmp/hosts-perf/metadata_variant.mjs` with `top_metrics | terms | terms_latest` variants for future re-validation.

### Host count endpoint (`/api/infra/host/count`)

| range | took_ms | wall_ms | buckets |
| ----- | ------: | ------: | ------: |
| 1h    | ~30    | ~60    | 1500   |
| 24h   | ~470   | ~500   | 1500   |

The count endpoint uses `MAX_HOST_COUNT_LIMIT = 10000`, so at any fleet size below 10k it materialises **every host bucket**. At 24h it's not free.

### KPI Lens fan-out (single query, simulated)

Each KPI chart (CPU / Load / Memory / Disk = **4 in parallel**) issues a date_histogram with a host filter. The product currently uses an `OR`-of-`match_phrase` filter built by [`buildCombinedAssetFilter`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/public/utils/filters/build.ts):

| filter shape       | 100 / 1h | 500 / 1h | 100 / 24h | 500 / 24h |
| ------------------ | -------: | -------: | --------: | --------: |
| `bool.should` (current) | 10 ms |  ~110 ms | 142 ms |  ~400 ms |
| flat `terms` (proposed) | 12 ms |   33 ms |  86 ms |  ~270 ms |

The `should` shape costs **30–75% more** than a flat `terms` filter; the gap widens with `limit`.

Multiplying by 4 parallel KPIs at 500/24h: **~1.6 s** on `should` vs **~1.1 s** on `terms` of ES work (plus Lens / Kibana overhead, which is non-trivial because Lens serializes/expands each filter).

---

## Where time actually goes for a 500-host / 24h page load

Sequence of work that fires on the Hosts page (server-side, local timings):

```mermaid
sequenceDiagram
  participant UI as Hosts UI
  participant KBN as Kibana server
  participant ES as Elasticsearch
  UI->>KBN: POST /api/metrics/infra/host (limit=500)
  KBN->>ES: getFilteredHostNames (terms on host.name)
  ES-->>KBN: 500 names in ~500ms
  par "in parallel"
    KBN->>ES: getAllHosts (terms + metric subaggs + 3 top_metrics + monitoredHosts)
    ES-->>KBN: 5.0s, 1.41 MB
  and
    KBN->>ES: getHostsAlertsCount
    ES-->>KBN: ~10ms (no alert docs)
  end
  KBN-->>UI: nodes[] (~5.5s end to end)
  UI->>KBN: POST /api/infra/host/count (parallel with above)
  KBN->>ES: getFilteredHostNames(limit=10000)
  ES-->>KBN: ~500ms, 1500 buckets
  Note over UI: Table renders here
  UI->>ES: 4 × KPI Lens (each with 500-host OR filter)
  ES-->>UI: ~400ms each, in parallel
  Note over UI: KPIs render (~5.5s after open)
```

Locally: ~5.5 s + 0.4 s KPI = **~6 s total wall-clock**.
Ty's Serverless: **8+ minutes** at 500/24h. The 80× gap is consistent with Serverless cold-tier I/O and shard fan-out: a single 6 GB primary-only shard on a fast local SSD is the cheapest possible substrate for this aggregation; in Serverless this is many shards with object-storage backing.

---

## What we measured vs. what we didn't

The numbers in the matrix and decomposition above are **Elasticsearch-side** measurements: `took_ms` from `_search` and `_search?profile=true` against the production query shapes. They are **not** the end-to-end Kibana API response time. This distinction matters, as Nathan flagged on the original issue:
> *"We must be very careful comparing the response time of an ES query to the response time of a Kibana API endpoint. Not sure if we've determined that the bottleneck of the snapshot endpoint is the DSL query or other things happening in Kibana."* — referring to the analogous post-processing in [`get_nodes.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/snapshot/lib/get_nodes.ts).

### Captured: local boundary (HAR + Kibana Inspector, 1500-host semconv fixture)

For a 1500-host / 24h local run we now have both Inspector ES `took` and HAR end-to-end timings for the two main host endpoints. Numbers are from one page load captured 2026-05-19; behaviour is consistent across reruns:

| endpoint | ES `took` (Inspector "Query time") | Kibana wall (HAR) | Node-side overhead |
| --- | ---: | ---: | ---: |
| `POST /api/metrics/infra/host` (`get all hosts`)             | 1145 ms | 1249 ms | ~104 ms (**~8%**) |
| `POST /api/metrics/infra/host` (`get filtered host names`)   |  239 ms | 1481 ms | endpoint-bound; flushes with the heavy sub-search |
| `POST /api/infra/host/count`                                 |  172 ms |  205 ms | ~33 ms (**~16%**) |

(At limit=500/24h on the same fixture, where the heavy `getAllHosts` lands at ~5 s ES, the absolute Node overhead is ~270 ms — i.e. ~5% — because the Node-side work scales with the response payload not the ES wall time.)

**Implication.** Locally, the Kibana node adds 5–19% on top of ES. The 80× Serverless multiplier observed by Ty is therefore **ES-bound, not Node-bound** on the local substrate. Node-side work (Phase A name dedup, post-enrichment filtering, alert-count join, per-bucket decoding) is second-order on the local cluster; it could climb to first-order on Serverless once the ES side gets cheap, but the share would still be small compared to the ES-side cost, so the proposals in `PROPOSALS.md` target the ES side first regardless.

The Kibana-side work that's invisible to an ES profile (still relevant context):
- **Host-name union + dedup** in [`get_hosts.ts:120-142`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts.ts) — `[...new Set([...filteredHosts, ...apmHosts])]` over potentially thousands of names from two upstream queries running in parallel.
- **`applyMustNotFilters`-equivalent post-enrichment** in [`get_hosts.ts:72-82`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts.ts).
- **Alert-count join** in [`get_hosts.ts:84-95`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts.ts).
- **Per-bucket decoding** in [`get_all_hosts.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_all_hosts.ts) — walk metric/metadata lists, deep-optional access, array allocation per bucket.
- **io-ts validation** of the response payload before serialisation.
- **Search-service / Lens overhead** for the four KPI charts.

### Captured: every endpoint fires twice on first load

The Inspector also surfaces a separate inefficiency unrelated to ES cost. On first page load, the heavy endpoints fire **twice** (the first request gets cancelled client-side as soon as the second resolves):

| endpoint | first fire (cancelled) | second fire (used) | wasted ES work |
| --- | ---: | ---: | ---: |
| `/api/metrics/infra/host`     | ~800 ms before cancel | full wall                          | ~one `getAllHosts` agg per page load |
| `/api/infra/host/count`       | ~200 ms before cancel | full wall                          | ~one `getFilteredHostNames` per page load |
| `/api/metrics/time_range_metadata` | initial fire then refire | full wall                     | one extra hasData scan |

Root cause: two upstream resolutions settle asynchronously in the first ~300 ms and each transition forces the [`useFetcher`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/public/hooks/use_fetcher.tsx) dependency array to refire. They are:

1. **`metricsView?.dataViewReference`** — undefined until the saved-object DV resolves. Once defined, `buildQuery`'s identity changes (it's in the `useCallback` deps in [`use_unified_search.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/public/pages/metrics/hosts/hooks/use_unified_search.ts)), so the payload memo refires.
2. **The `time_range_metadata` fetch** — until it settles, `SearchBar` has no signal to flip `searchCriteria.preferredSchema` from `null` to a concrete schema; that flip changes the payload memo and refires the fetcher.

This is fully **schema-agnostic** — same race exists on ECS clusters. Architecturally it's "free latency to claim": stopping the duplicate fire doesn't change any query shape, it just stops asking ES for the same answer twice. The gate-design space (value-check vs. status-check, and why neither alone covers the empty-cluster and metadata-failure paths) is worked through in [`PROPOSALS.md`](./PROPOSALS.md) §P5.5.

### Still pending

- **APM spans through `getHosts`** — one short PR wrapping `getHosts`, `getFilteredHostNames`, `getAllHosts`, `getApmHostNames`, and the post-processing block in custom spans so an APM trace tells us — for free, in production — exactly where time goes. Non-blocking for Tier 1; mandatory before committing to `TS` on Phase B.
- **ECS empirical measurement matrix** — the comparison numbers in §"Why the metric sub-aggs are so expensive" are extrapolated from per-metric agg shapes plus the semconv matrix. They should be confirmed against a metricbeat-system fixture before they're used in any commitments.
- ~~**APM-host coverage on the measurement matrix.**~~ **Now captured — see "APM-host matrix" below.** New scenario [`infra_apm_only_hosts.ts`](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-synthtrace/src/scenarios/infra_apm_only_hosts.ts) layered 800 APM-only hosts on top of the existing 1500-host semconv fixture; matrix re-run with cold cache between every measurement.
- **Sparse-metadata empirical verification.** New synthtrace scenario [`infra_hosts_semconv_sparse_metadata.ts`](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-synthtrace/src/scenarios/infra_hosts_semconv_sparse_metadata.ts) (added in this branch) exercises both the *sparse-metadata* case (last 30 % of the window omits `host.os.name` / `cloud.provider` / `host.ip`) and the *migrated-metadata* case (1 in 5 hosts changes those fields halfway through the window). Two verifications outstanding: (a) load the scenario and confirm the Hosts UI metadata cells display the latest non-null value (sparse hosts: `aws / ubuntu / 122.122.122.122` from the earlier samples; migrated hosts: `gcp / rhel / 10.0.0.42` from the later samples) — locks the invariant the kept `top_metrics` shape provides today; (b) repeat once we have a TS PoC and verify `LAST_OVER_TIME(field)` returns the expected values per-field, falling back to `WHERE field IS NOT NULL` if any of `host.os.name` / `cloud.provider` / `host.ip` are doc attributes rather than TSDS dimensions.

#### APM-host matrix (1500 infra + 800 APM-only hosts, cold cache, end-to-end Kibana wall)

Setup: existing 1500 semconv hosts (`semconv-host-*`) plus 800 APM-only hosts (`apm-only-host-*` and `apm-only2-host-*`) ingested via the new [`infra_apm_only_hosts.ts`](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-synthtrace/src/scenarios/infra_apm_only_hosts.ts) scenario into `traces-generic.otel-*`. APM-only hosts have **no** docs in `metrics-hostmetricsreceiver.otel-*`. Cache cleared (`request`, `query`, `fielddata`) before each measurement.

| limit | range | `/api/metrics/infra/host` wall | `/api/infra/host/count` wall | Phase B + post (diff) | `countVal` | `hostsReturned` |
| ----: | ----: | -----------------------------: | --------------------------: | --------------------: | ---------: | --------------: |
|   100 |    1h |                         136 ms |                       42 ms |                 94 ms |       2300 |             100 |
|   500 |    1h |                         376 ms |                       43 ms |                333 ms |       2300 |             500 |
|   100 |    6h |                         512 ms |                      155 ms |                357 ms |       2300 |             100 |
|   500 |    6h |                       1540 ms |                      145 ms |               1395 ms |       2300 |             500 |
|   100 |   24h |                       1646 ms |                      490 ms |               1156 ms |       2300 |             100 |
|   500 |   24h |                   **5554 ms** |                   **507 ms** |          **5047 ms** |       2300 |             500 |

**Key signal — `countVal = 2300` but `hostsReturned ≤ limit` is always 100 % `semconv-*`** (verified by sampling the first / last / per-prefix bucket of the 500-host response). The 800 APM-only hosts contribute to the count UI hint but **never reach the table**. Root cause: `getAllHosts`'s `terms({ field: 'host.name', size: limit })` runs over the infra `metrics-*` indices only — APM-only hosts have zero docs there, so the agg emits zero buckets for them regardless of the `hostNames` filter that was carefully built to include them. The `_key: 'asc'` ordering also doesn't save them: even though `apm-only-*` < `semconv-*` lexicographically, no bucket = no row.

So APM-only hosts are **silently lost between Phase A and Phase B** today. The user sees "Limited to 2300" in the UI hint, paginates expecting to find them, and never can. Independent of the 500-cap perf story; this is a correctness / discoverability gap that any future fix to the host-loading pipeline needs to close.

#### What this changed about the cost picture

- **Phase A's cost stayed in proportion with the infra-only run.** 507 ms cold-cache at 24h includes both `getFilteredHostNames` (1500 metric-bearing hosts) **and** `getApmHostNames` (800 APM-only hosts over ~6.4 M raw transaction spans, falling back to the `TransactionEvent` source because synthtrace did not produce a `TransactionMetric` rollup — see the synthtrace gap below). The Promise.all means we pay max(infra, APM), not sum.
- **Phase B's cost was unchanged.** 5047 ms ≈ the infra-only 5001 ms baseline. APM-only hosts in the `terms BY host.name [union]` filter don't inflate the cost because they have no matching docs to scan and contribute zero buckets. The `bool.filter.terms` clause is cheap; the agg fan-out is what scales, and that's bounded by metric-bearing hosts only.
- **Node-side overhead is now visible in the end-to-end numbers.** Phase B's raw ES `took` was 1603 ms (cold) in the metadata ablation; the end-to-end 5554 ms wall at 500/24h means ~3950 ms is Node-side work *or* re-execution of the same `getAllHosts` shape against a now-different cluster cache state. The previous ablation script was already anchored to the same time range and used the same query shape, so this gap is probably orchestration cost (alerts client, post-processing, response serialisation, Lens fan-out triggered via the table renderer). APM spans through `getHosts` would resolve this conclusively — that work is now even more clearly mandatory before committing to a `TS`-on-Phase-B PoC.

#### Sequencing experiment considered, then rejected

While investigating these findings we prototyped sequencing Phase A (infra → APM, skip APM when infra fills the limit) to save the ~37 ms of wall time and the cluster CPU of an APM query whose result was silently dropped. Worked out the actual numbers:

- Saturated regime wall saving: `max(0, apm_wall − infra_wall)`. On our matrix that was ~37 ms.
- Under-limit regime wall penalty: `min(infra_wall, apm_wall)`. On real fleets that's typically 50–200 ms.

In wall terms the trade is symmetric-to-net-negative. The only unambiguous benefit was ES cluster CPU in the saturated regime, which isn't worth the under-limit regression. Reverted to `Promise.all`. The real waste in this area is silent under-counting in the APM-side `MAX_SIZE = 1000` clamp (Phase A side, [`apm_data_access/.../get_host_names/index.ts:71`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm_data_access/server/services/get_host_names/index.ts)) and the structural Phase B drop of APM-only hosts documented above; both are diagnosed here, with the fix space worked through in `PROPOSALS.md`.

#### Synthtrace gap discovered en route

The OTel APM pipeline's `createTransactionMetricsAggregator('1m')` rolls raw transaction spans into `metrics-transaction.1m.otel-*` rollup docs (the same index that `getApmHostNames` prefers via `getDocumentSources` → `TransactionMetric`). In our run, the synthtrace pipeline produced 6.4 M raw spans in `traces-generic.otel-*` but **zero rollup docs** in `metrics-transaction.1m.otel-default`, `metrics-service_transaction.1m.otel-default`, and `metrics-service_summary.1m.otel-default`. Kibana's APM data access plugin gracefully fell back to the raw `TransactionEvent` source (controlled by `getPreferredBucketSizeAndDataSource`), so the end-to-end behaviour we measured matches the **fallback path**, not the preferred-rollup path. In production, customers with healthy APM rollups would hit a different code path that may be faster (smaller docs in `transaction.1m.otel`) but the host-name resolution semantics are the same. Worth filing as a separate synthtrace issue; for our purposes the end-to-end matrix above remains representative of the worst case (raw-span fallback).

#### Ordering across the whole pipeline

The pipeline never uses a relevance / recency / health signal for **selection**. Every stage that decides "which hosts make it into the response" sorts by `host.name` lexicographically, and only the *display* layer applies user-meaningful sorting — over the already-truncated set. The result is a stack of independent alphabetic cuts whose combination produces subtle, silent correctness gaps.

| Stage | File | Selection signal | Display signal | Cap |
| --- | --- | --- | --- | --- |
| Phase A — infra names | [`get_filtered_hosts.ts:42-48`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_filtered_hosts.ts) | `host.name` asc | — | `limit` (500) or `MAX_HOST_COUNT_LIMIT` (10 000) for the count endpoint |
| Phase A — APM names | [`get_host_names/index.ts:67-75`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm_data_access/server/services/get_host_names/index.ts) | `host.name` asc | — | `min(size, MAX_SIZE=1000)` — hard cap regardless of what caller passes |
| Phase B — metrics + metadata | [`get_all_hosts.ts:78-85`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_all_hosts.ts) | `host.name` asc | `hasSystemMetrics` desc, then `cpuV2` desc (Node-side post-sort, [`get_all_hosts.ts:165-178`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_all_hosts.ts)) | `limit` |
| Alerts | [`get_hosts_alerts_count.ts:50-67`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts_alerts_count.ts) | `host.name` asc (independent of Phase B) | joined by name in Node ([`get_hosts.ts:84-95`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts.ts)) | `limit` |
| UI table | client | — | user-chosen column (client-side sort over returned rows) | rendered rows only |

The `cpuV2`-desc sort that the user *thinks* is "rank the fleet by CPU" is actually "rank the alphabetic top-`limit` by CPU". Same for memory, disk, load — any column-header sort the user clicks. Selection is upstream of all of them. Concrete failure modes:

- **"Top 500 hosts by CPU" is alphabetically biased.** A host at 99 % CPU named `zzz-prod-01` is invisible if the alphabetic top-500 ends at `web-server-`. The Node-side `(hasSystemMetrics, cpuV2)` sort runs only over the selected set.
- **Renaming a host changes its visibility.** Migrate `web-prod-001` to `01-web-prod-001` and the host gains a top-of-list slot; the host it displaced becomes invisible until the alphabetic tail rolls off.
- **"Sort by name desc" only reverses the alphabetic prefix.** Below the fold the user sees `web-server-499 → aaa-001` reversed; they never reach `xxx-001` because `xxx-001` was already truncated upstream.

**Alerts add a second, independent alphabetic cut on top.** `getHostsAlertsCount` runs its own `terms(host.name, size: limit, order: _key asc)` over the alerts indices, scoped to the `hostNames` union from Phase A, and `get_hosts.ts` joins the result back onto the Phase B rows by name. So `alertsCount` lands on a row only when the host appears in **both** the alphabetic top-`limit` of metric-bearing hosts **and** the alphabetic top-`limit` of alert-bearing hosts. Two independent truncations have to agree.

This produces two distinct alerts-correctness modes:

- **Mode A — alert truncation undershoots the visible set.** When more than `limit` hosts in the union have active alerts, the alphabetic tail of alert-bearing hosts is dropped. Visible rows in that range show `alertsCount: undefined` even though they have active alerts. The user sorts the alerts column desc to find the worst, the worst aren't there.
- **Mode B — APM-only host names skew the alert cut away from visible rows.** APM-only host names typically sort earlier than infra names (in our local fixture every `apm-only-*` sorts before every `semconv-*`). The alerts agg buckets alphabetic top-`limit` from the *union*, which in pathological clusters can be 100 % `apm-only-*` — and none of those map back to visible rows, because Phase B can only bucket metric-bearing hosts. The visible (infra) rows all show `alertsCount: undefined`. Today this is rare in practice but the structural mismatch is present.

**Caveats this introduces on the rest of this report.**

Every cost estimate that touches the Kibana node should be read as a **lower bound** on what a real-ordering implementation might achieve. Every cross-schema estimate is a hypothesis pending the ECS run. Every APM-aware Phase A estimate is pending the APM-host variant. Every "host X is missing from the table" report should be read against the lexicographic-ordering stack above — the host may exist and may even have data, but its name didn't sort high enough to be selected.

### Relevant evidence from outside this repro (May 2026)

Two Search Labs posts published in early May 2026 directly affect the cost / benefit of the `TS` (ES|QL time-series) path on the semconv side. Numbers from the second post are benchmark-grade, single-node, default-configuration runs against OTel host metrics — i.e. our exact regime:

- *[Don't leave metrics on the table: query them with the ES|QL TS command](https://www.elastic.co/search-labs/blog/esql-ts-command-querying-metrics)* — `TS` is now GA in 9.4 with native per-time-series semantics. Implicit inner aggregation is `LAST_OVER_TIME`, which is exactly what our `top_metrics(sort: @timestamp desc, size: 1)` calls do today for `host.os.name` / `cloud.provider` / `host.ip`.
- *[30x faster than Prometheus: How we rebuilt Elasticsearch as a leading columnar metrics datastore](https://www.elastic.co/search-labs/blog/elasticsearch-columnar-metrics-engine-30x-faster-prometheus)* — published benchmarks: gauge average and counter rate **<2 s on 1.4M time series × 4h of data**, up to **30× faster than Prometheus / Mimir**, up to **8× faster than ClickHouse**.

Our 1500-host / 24h fixture is roughly 7.5k–15k time series — well inside the regime where those benchmarks were measured. The 80× local-vs-Serverless gap stops looking architectural and starts looking closeable, provided the Serverless deployment is on 9.4+ and the relevant indices are TSDS.

Schema applicability of these capabilities: `TS` requires a time-series data stream. `metrics-hostmetricsreceiver.otel-*` (semconv) is TSDS by default; `metricbeat-*` (the typical ECS host-metrics path) is **not** in most customer setups. So these specific wins are semconv-only on today's data layouts. The ECS path's costs are dominated by the orchestration-level work (Phase A / Phase B / metadata aggs / count endpoint / KPI fan-out / duplicate first-paint fetch) that is independent of the metric agg shape, and it inherits the automatic storage-layer improvements (doc value skippers, synthetic IDs, sequence-number trimming, larger codec blocks) that ship as 9.3 / 9.4 defaults for any TSDS-mode index. Migrating metricbeat-system to TSDS is a separate, larger conversation outside the scope of this report.

The fix space — which `TS` primitives could apply to which part of the pipeline, the candidate PoC scope, and the schema caveats — is in [`PROPOSALS.md`](./PROPOSALS.md) §"ES|QL as an implementation candidate".

---

## Why the metric sub-aggs are so expensive (this is the one schema-specific driver)

The per-metric agg cost is the **only** part of this investigation that differs structurally between schemas. Everything else (`top_metrics` metadata, `monitoredHosts` duplicate bucket, KPI fan-out, count endpoint, double-fire) is identical across `ecs` and `semconv`. The metric agg shape is where semconv pays a structural tax — and where ECS gets off comparatively cheap.

Side-by-side per-metric agg shapes for the default `HOST_TABLE_METRICS` set (taken from [`metrics_data_access/common/inventory_models/host/metrics/snapshot/`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/metrics_data_access/common/inventory_models/host/metrics/snapshot/)):

| metric            | ecs sub-aggs | semconv sub-aggs |
| ----------------- | -----------: | ---------------: |
| cpuV2             | 1 (`avg`)              | 3 (`terms(state)` + `avg` + `sum_bucket` + `bucket_script`) |
| normalizedLoad1m  | 1 (`avg`)              | 3 |
| memory            | 1 (`avg`)              | 3 |
| memoryFree        | 1 (`avg`)              | 12 (4 × `terms(state)` for cached/free/slab\_unreclaimable/slab\_reclaimable, each with the chain above) |
| diskSpaceUsage    | 1 (`avg`)              | 6 |
| **total (sub-aggs ×  host buckets)** | **5 × N** | **27 × N** |

So at the default `limit = 100` on semconv we run **2 700** aggregation slots per `getAllHosts`; on ECS the same call is **500** slots — a **~5×** structural difference, holding everything else constant.

The root cause is that the semconv schema encodes the per-state breakdown at query time via `terms(state, include=…)` rather than at ingest time as a single-document gauge (the ECS approach). This is structurally unavoidable for raw OTel data — and it means **the metric sub-agg row is where the absolute cost difference between the schemas is largest**, while every other root cause in this report is identical across both.

Both schemas pay, in identical shape:
- the per-metric agg slots at 24h × 500 hosts (small individually, large in aggregate; 27 × N on semconv vs 5 × N on ECS),
- all three `top_metrics` metadata aggs,
- the `monitoredHosts` duplicate bucket,
- the 10 000-bucket count endpoint,
- the KPI `OR`-of-500 in the Lens fan-out,
- the double-fire on first paint,
- the `metrics-*,metricbeat-*` fan-out in Serverless.

Below is what we'd predict for the ECS table on the same fixture topology (1500 hosts, 24h). Numbers are extrapolated from the matrix above plus the schema multiplier, and should be validated empirically before being treated as commitments:

| variant (predicted, ECS, 500/24h) | predicted took_ms |
| --- | ---: |
| **full**                                          | ~2.8–3.5 s |
| no `top_metrics`                                  | ~1.6–2.1 s |
| no metric sub-aggs (count-only)                   | ~0.5–0.6 s |

The key implication: **the absolute slowness is worse on semconv but the per-cost-driver shape is identical — every root cause we've identified is present on both schemas, just at different absolute magnitudes.** What we could do about it (and at what tier of cost/risk) is in [`PROPOSALS.md`](./PROPOSALS.md).

---

## Appendix — repro / instructions

```sh
# Local ingest (1500 hosts, ~25h backfill)
node scripts/synthtrace.js infra_hosts_semconv \
  --target=http://elastic:changeme@localhost:9200 \
  --kibana=http://elastic:changeme@localhost:5601 \
  --from=now-25h --to=now \
  --scenarioOpts numHosts=1500 \
  --concurrency=4 --workers=4
# NB: if the OTel index template already exists from a previous Kibana run, delete the
# data stream and template first (otherwise docs go to the failure store):
#   DELETE _data_stream/metrics-hostmetricsreceiver.otel-default
#   DELETE _index_template/metrics-hostmetricsreceiver.otel
```

Scripts used for the matrix (kept in `/tmp/hosts-perf/`):

- `build_query.mjs` — issues the canonical `getFilteredHostNames` then `getAllHosts` against ES, with variants `full | no_top_metrics | no_monitored | no_metric_aggs | bare_terms`. Set `PROFILE=1` to capture `profile=true`.
- `count_query.mjs` — the `getHostsCount` equivalent (`size: 10000`).
- `kpi_query.mjs` — one KPI-style date_histogram with the host list as `should` or `terms`.
- `metadata_variant.mjs` — 3-way ablation harness for the metadata aggs (`top_metrics | terms | terms_latest`). Anchors the time range to the dataset's max `@timestamp`. See "Why we kept `top_metrics` for host metadata".
- `hit_kbn.mjs` — hits `/api/metrics/infra/host` and `/api/infra/host/count` end-to-end through Kibana (with `elastic-api-version: '1'` and `x-elastic-internal-origin: 'kibana'` headers) for the APM-host matrix and the end-to-end vs. ES `took` diff.

All numbers above are median of 3 warm runs against `http://localhost:9200/metrics-*,metricbeat-*` unless explicitly labelled "cold cache" (APM-host matrix and 3-way ablation).

---

## References

- Server pipeline: [`x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts.ts)
- Heavy query: [`get_all_hosts.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_all_hosts.ts)
- Filtered names: [`get_filtered_hosts.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_filtered_hosts.ts)
- Count: [`get_hosts_count.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/server/routes/infra/lib/host/get_hosts_count.ts)
- API validation (500-cap): [`get_infra_metrics.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/common/http_api/infra/get_infra_metrics.ts) lines 42–52
- Client hooks: [`use_hosts_view.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/public/pages/metrics/hosts/hooks/use_hosts_view.ts), [`use_host_count.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/public/pages/metrics/hosts/hooks/use_host_count.ts)
- KPI fan-out: [`kpi_charts.tsx`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/public/pages/metrics/hosts/components/kpis/kpi_charts.tsx), [`build.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/infra/public/utils/filters/build.ts)
- Inventory model (host): [`metrics_data_access/common/inventory_models/host/index.ts`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/metrics_data_access/common/inventory_models/host/index.ts) and [`metrics/snapshot/*`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/metrics_data_access/common/inventory_models/host/metrics/snapshot/)


