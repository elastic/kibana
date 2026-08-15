# DEx API Performance Harness -- Metrics Reference

## What the Tool Does

The harness benchmarks a single Kibana endpoint:
`POST /internal/detection_engine/prebuilt_rules/installation/_perform`.
This is the batch install endpoint that installs ~1965 prebuilt detection rules.
The endpoint is internal, low-frequency (invoked once by an admin), but
resource-intensive -- it performs batched Saved Object writes, task scheduling,
and optionally change-history round-trips.

The harness runs 6 scenarios across N cloud-deployed environments, collecting
timing, memory, and resource contention metrics. All results are written to
three Elasticsearch indices on a separate results cluster.

## Data Flow

```
For each environment in environments.json:

  1. KibanaClient calls GET /api/status            --> captures memory BEFORE
  2. KibanaClient calls POST installation/_perform  --> timed with performance.now()
  3. Meanwhile, MemorySampler polls GET /api/status every 1s
                                                    --> captures rss, heap, ELU
  4. KibanaClient calls GET /api/status            --> captures memory AFTER
  5. ESWriter indexes the iteration doc            --> perf-dex-prebuilt-rules-iterations
  6. ESWriter bulk-indexes memory samples          --> perf-dex-prebuilt-rules-memory
  7. After all iterations, ESWriter indexes the run summary
                                                    --> perf-dex-prebuilt-rules-runs
```

## Three Indices and Their Metrics

### 1. `perf-dex-prebuilt-rules-iterations` -- One document per iteration

This is the raw data. Every time the install endpoint is called, one document
is written.

| Field | Type | Source | What It Means |
|-------|------|--------|---------------|
| `@timestamp` | date | harness clock | When this iteration completed |
| `run_id` | keyword | generated | Groups all iterations from a single harness execution |
| `environment_id` | keyword | config | Which cloud project this ran against |
| `scenario` | keyword | scenario name | Which test scenario produced this (`cold_boot`, `warm_boot`, `scalability`, `contention`, `double_click`, `memory_stability`) |
| `boot_type` | keyword | scenario | `"cold"` (first-ever install) or `"warm"` (caches hot) |
| `iteration` | integer | loop counter | Which iteration within the scenario (1-based) |
| `duration_ms` | long | `performance.now()` around `POST installation/_perform` | **Wall-clock time** of the install request. This is the primary performance metric. |
| `http_status` | integer | HTTP response | 200 = success, anything else = error |
| `total_rules` | integer | response `summary.total` | How many rules were in the batch |
| `rules_succeeded` | integer | response `summary.succeeded` | Rules successfully installed |
| `rules_failed` | integer | response `summary.failed` | Rules that failed to install |
| `rules_skipped` | integer | response `summary.skipped` | Rules skipped (already installed) |
| `delete_duration_ms` | long | `performance.now()` around `POST _bulk_action delete` | Time to delete all rules before this iteration (cleanup cost) |
| `rss_before_mb` | double | `GET /api/status` before install | Resident Set Size before install (total process memory including code, stack, heap) |
| `rss_after_mb` | double | `GET /api/status` after install | RSS after install. `rss_after - rss_before` = memory growth during install |
| `heap_before_mb` | double | `GET /api/status` before install | V8 heap used before install (JS object memory only) |
| `heap_after_mb` | double | `GET /api/status` after install | V8 heap used after install. `heap_after - heap_before` = heap growth during install |
| `customer_read_latency_mean_ms` | long | contention scenario only | Average latency of `GET rules/_find` queries fired concurrently during install |
| `customer_read_latency_p95_ms` | long | contention scenario only | 95th percentile latency of those concurrent read queries |
| `concurrent_install_rejected` | boolean | double_click scenario only | `true` if this was the second concurrent install request that got rejected |
| `error_message` | text | exception | Error details if the request failed |

### 2. `perf-dex-prebuilt-rules-memory` -- Time-series samples during execution

The MemorySampler polls `GET /api/status` every 1 second while an install is
running. Each poll produces one document.

| Field | Type | Source | What It Means |
|-------|------|--------|---------------|
| `@timestamp` | date | sample clock | Exact time this sample was taken |
| `run_id` | keyword | generated | Links to the run |
| `environment_id` | keyword | config | Which cloud project |
| `scenario` | keyword | scenario name | Which scenario was running |
| `iteration` | integer | loop counter | Which iteration was running |
| `rss_mb` | double | `process.memory.resident_set_size_in_bytes` | Total process memory (OS-level). Includes V8 heap + native allocations + shared libraries |
| `heap_used_mb` | double | `process.memory.heap.used_in_bytes` | V8 JS heap used. This is the memory holding JS objects, closures, strings, etc. |
| `heap_total_mb` | double | `process.memory.heap.total_in_bytes` | V8 heap total (allocated by V8 from the OS). Difference from `heap_used` = fragmentation + free space in V8's pool |
| `event_loop_delay_ms` | double | `process.event_loop_delay` | Maximum event loop delay. High values (>100ms) mean the Node.js event loop is blocked -- requests queue up |

### 3. `perf-dex-prebuilt-rules-runs` -- One document per scenario per environment

Aggregated statistics computed after all iterations of a scenario complete. This
is the summary view.

| Field | Type | Source | What It Means |
|-------|------|--------|---------------|
| `@timestamp` | date | completion time | When the scenario finished |
| `run_id` | keyword | generated | Links to the run |
| `environment_id` | keyword | config | Which cloud project |
| `environment_role` | keyword | config | `"cold_boot"` or `"warm_boot"` |
| `scenario` | keyword | scenario name | Which scenario |
| `boot_type` | keyword | scenario | `"cold"` or `"warm"` |
| `stack_version` | keyword | config | Kibana version of the target environment |
| `kibana_memory_mb` | integer | config | Configured Kibana RAM (0 for serverless) |
| `es_heap_mb` | integer | config | Configured ES heap (0 for serverless) |
| `total_rules` | integer | first iteration | Rules in the batch |
| `iterations` | integer | count | How many iterations ran |
| `median_duration_ms` | long | computed | Median install time across iterations. **Primary comparison metric.** |
| `p95_duration_ms` | long | computed | 95th percentile -- captures worst-case excluding outliers |
| `p99_duration_ms` | long | computed | 99th percentile |
| `min_duration_ms` | long | computed | Fastest iteration |
| `max_duration_ms` | long | computed | Slowest iteration |
| `mean_duration_ms` | long | computed | Average (sensitive to outliers, prefer median) |
| `std_dev_ms` | double | computed | Standard deviation -- measures consistency. High stddev = unstable performance |
| `peak_rss_mb` | double | max of `rss_after_mb` | Highest RSS seen across all iterations |
| `peak_heap_mb` | double | max of `heap_after_mb` | Highest heap seen across all iterations |
| `oom_events` | integer | currently always 0 | Reserved for OOM detection |
| `errors` | integer | count of `http_status != 200` | How many iterations returned errors |

## How Metrics Correlate With Each Other

### `duration_ms` vs `total_rules` (Scalability)

The scalability scenario tests this directly. If the relationship is linear
(2x rules = 2x time), the endpoint is O(N). If 1000 rules takes 10x longer
than 100 rules, there is an O(N^2) problem -- likely an N+1 query or
inefficient duplicate checking.

### `duration_ms` vs `boot_type` (Cold vs Warm)

Cold boot includes Fleet package download from EPR, Saved Object cache
population, and ES connection pool warming. The difference between cold and
warm install time tells you how much overhead is environment initialization
vs actual business logic.

### `heap_before_mb` vs `heap_after_mb` (Memory Cost Per Install)

`heap_after - heap_before` = how much heap the install consumes. If this
grows across iterations in the memory_stability scenario, you have a leak.
If it is stable, the garbage collector is reclaiming properly.

### `rss_mb` vs `heap_used_mb` (Native vs JS Memory)

RSS includes everything: V8 heap + native C++ allocations + shared libraries
+ buffers. If RSS grows but heap stays flat, native memory is leaking (e.g.,
unclosed sockets, native buffers). If both grow together, it is JS objects
accumulating.

### `heap_used_mb` vs `heap_total_mb` (V8 Pressure)

`heap_total` is how much memory V8 has allocated from the OS. `heap_used`
is how much is actually in use. When `heap_used` approaches `heap_total`,
V8 will try to GC or expand. If `heap_total` approaches
`--max-old-space-size`, you are near OOM.

### `event_loop_delay_ms` vs `duration_ms` (CPU Saturation)

Event loop delay measures how long synchronous work blocks Node.js from
processing other requests. If event loop delay spikes during install
(>100ms), the install is CPU-bound and blocking all other Kibana operations.
High ELU + high `duration_ms` = CPU bottleneck. Low ELU + high `duration_ms`
= I/O bottleneck (waiting on ES).

### `customer_read_latency_p95_ms` vs `duration_ms` (Contention)

The contention scenario measures both simultaneously. If
`customer_read_latency_p95_ms` spikes during install but is low at idle, the
batch operation is starving customer-facing reads -- likely due to ES query
queue saturation or Kibana event loop blocking.

### `delete_duration_ms` vs `duration_ms` (Cleanup Cost)

If `delete_duration_ms` is a significant fraction of the total cycle time,
the benchmark is spending more time on cleanup than on the actual endpoint
under test. Also useful to detect if delete performance degrades after many
install/delete cycles.

### `std_dev_ms` (Consistency)

A high standard deviation relative to the median means install time is
unpredictable. This often indicates GC pauses, ES cluster load fluctuations,
or contention with background tasks. Low stddev = reliable performance.

### `concurrent_install_rejected` (Idempotency)

In the double_click scenario, exactly one of the two concurrent requests
should succeed and one should be rejected. If both succeed, you have a
concurrency bug (possible duplicate rules). If both fail, the concurrency
limiter is too aggressive.

## Scenario-Specific Metric Collection

| Scenario | Iterations | What's Unique |
|----------|-----------|---------------|
| `cold_boot` | 1 per environment | No delete before install. Includes `initializeSecuritySolution()` (Fleet/EPR bootstrap). Environment is consumed. |
| `warm_boot` | N (default 5) | Delete/install cycles. Primer pass warms caches first. Measures steady-state. |
| `scalability` | N per payload size (100, 500, 1000, 1965) | Uses `installSpecificRules()` with rule subsets. `total_rules` varies. |
| `contention` | N | Fires `GET rules/_find` every 200ms concurrently during install. Populates `customer_read_latency_*_ms`. |
| `double_click` | N | Two concurrent `installAllRules()` via `Promise.allSettled()`. Two docs per iteration. Populates `concurrent_install_rejected`. |
| `memory_stability` | 20 (hardcoded) | Continuous memory sampling across all 20 cycles. No per-iteration sampler start/stop. |

## How Memory is Collected

The harness reads Kibana's `GET /api/status` endpoint, which exposes Node.js
process metrics via the core metrics collector:

```
GET /api/status ->
  body.metrics.process.memory.heap.used_in_bytes          -> heap_used_mb
  body.metrics.process.memory.heap.total_in_bytes         -> heap_total_mb
  body.metrics.process.memory.resident_set_size_in_bytes  -> rss_mb
  body.metrics.process.event_loop_delay                   -> event_loop_delay_ms
```

Two collection modes:

1. **Snapshot** (before/after): A single `GET /api/status` call before and
   after each install. Gives you the delta.
2. **Time-series** (MemorySampler): Continuous polling at 1-second intervals
   during install. Gives you the shape of memory usage over time (spike,
   plateau, or gradual climb).
