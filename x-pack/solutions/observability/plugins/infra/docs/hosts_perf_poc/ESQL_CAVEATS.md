# ES|QL caveats hit during the Hosts UI Tier-1 PoC

Notes gathered while implementing three opt-in ES|QL render paths for the
Hosts UI (P15b: server-endpoint KPI strip, P15c: Lens-ES|QL KPI tiles,
P16-A: Lens-ES|QL Metrics-tab tiles). Filed so the ES|QL team can decide
what's expected, what's a feature gap worth tracking, and what's worth a
follow-up issue.

Versions of interest: 8.x serverless, deploy bench against
`elastic-cloud.com` cluster, 5000 hosts × 24 h of OTel `hostmetricsreceiver`
data in TSDS. Direct `_query` requests in `kpi_bench_v2.mjs`; ES|QL via
`InfraMetricsClient.esql()` in app code.

## TL;DR

Five things were structurally blocking and we worked around them; two
features we wanted to try but didn't (would benefit from a quick read
from the ES|QL team).

### Workarounds shipped

1. **`long / long` → integer division.** Silent, no warning. Have to
   wrap operands in `TO_DOUBLE(...)` on every ratio formula.
2. **`MAX` / `MIN` reject counter types.** Have to `TO_DOUBLE(field)`
   first to strip counter semantics — affects every counter-rate metric
   we render (rx, tx, diskIO, diskThroughput).
3. **`TS` pipeline rejects filter-in-aggregation.** Blocks using `RATE()`
   because we need `WHERE attributes.direction == "read"` inside the
   STATS to split read/write counter metrics. Workaround: stay on `FROM`,
   compute `(MAX - MIN) / bucket_seconds` manually.
4. **`STATS … WHERE field == ...` doesn't use the inverted index.** The
   filter runs row-by-row in the streaming aggregation operator, ~3×
   slower than a pre-STATS `WHERE field IN (...)` filter that prunes via
   the inverted index. Bench numbers below.
5. **`WHERE host.name IN ()`** (empty list) returns a parser error
   instead of an empty result set. Have to skip the filter clause at
   build time when the list is empty.

### Features we wanted but didn't try

A. **`SET approximate = true`** — the KPI endpoint uses
   `COUNT_DISTINCT(host.name)` for the "of N hosts" subtitle. Exact at
   5000 hosts, fine wall-time. Would be nice to know if `SET approximate`
   shaves anything off at higher cardinalities and what the error margin
   looks like. We didn't measure.

B. **`TS` command** — we wanted `TS` + `RATE()` for the four counter-rate
   metrics in the Metrics tab. Blocked by (3) above. Once filter-in-agg
   works inside `TS`, we could drop the manual `(MAX - MIN) / s` math.

## Detailed notes

### 1. Integer division on `long / long`

The OTel `system.filesystem.usage` field ingests as `long` (bytes). The
inventory-model disk-usage formula is `1 - SUM(free) / SUM(total)`.
Verbatim:

```esql
| STATS
    fs_free  = SUM(metrics.system.filesystem.usage) WHERE state == "free",
    fs_total = SUM(metrics.system.filesystem.usage)
| EVAL diskUsage = 1 - (fs_free / fs_total)
```

For any host where `fs_free < fs_total` (i.e. essentially every host
running anything) this returns `1 - 0 = 1` → tiles render at 100% usage.
No warning, no NaN, no `null` — it silently returns 1.

Workaround applied across `esql_kpi_chart.ts` (line 101) and
`esql_metrics_chart.ts`:

```esql
| EVAL diskUsage = CASE(fs_total > 0, 1 - TO_DOUBLE(fs_free) / TO_DOUBLE(fs_total), NULL)
```

**Ask:** can the engine surface this as a verifier warning at least when
the literal `1` is involved? It's the kind of bug that only shows up in
the rendered value, not in the query results table.

### 2. `MAX` / `MIN` reject counter types

OTel `hostmetricsreceiver` writes network and disk I/O fields as
`counter_double` / `counter_long`. A literal `MAX(system.disk.operations)`
fails verification with:

> argument must be ... numeric except counter types

Workaround in `esql_metrics_chart.ts:39-40`: wrap the field reference
in `TO_DOUBLE(...)` to drop the counter semantics without changing the
numeric value.

```esql
| STATS
    read_max = MAX(TO_DOUBLE(system.disk.operations)) WHERE attributes.direction == "read",
    read_min = MIN(TO_DOUBLE(system.disk.operations)) WHERE attributes.direction == "read"
```

**Ask:** is there a planned path for `MAX` / `MIN` over counter types
that returns the bare numeric? The cast works but feels ceremonial.

### 3. `TS` rejects filter-in-aggregation

We wanted to use `TS` + `RATE()` for the counter metrics — that's the
canonical ES|QL pattern for counter-rate aggregation, and it should be
faster than rolling our own MIN/MAX delta because it can use the dimension
routing path more efficiently.

We need to split each metric by `attributes.direction` (read vs write,
receive vs transmit). The natural shape:

```esql
TS metrics-hostmetricsreceiver.otel-*
| STATS
    read  = RATE(system.disk.operations) WHERE attributes.direction == "read",
    write = RATE(system.disk.operations) WHERE attributes.direction == "write"
  BY host.name, BUCKET(@timestamp, 5m)
```

Verification rejected the filter-in-aggregation. We didn't find a
documented way to push the `direction` predicate into `TS` itself
(equivalent to a `match_all` query parameter would work, but `TS`'s
filter parameter doesn't seem to thread through to the STATS operator
the same way `_query`'s `filter` does for `FROM`).

Fell back to `FROM` + the manual rate calculation
(`(MAX - MIN) / bucket_seconds`) documented in
`esql_metrics_chart.ts:21-30`.

**Ask:** is filter-in-aggregation inside `TS` on the roadmap? If not,
is there a recommended shape for "rate of a counter, sliced by a
dimension that doesn't appear in the routing path"?

### 4. `STATS … WHERE` doesn't use the inverted index

Measured with `kpi_bench_v2.mjs` against the deploy cluster (5000 hosts
× 3 h, cold cache, median of 3 runs):

| Shape | Wall | `took` |
|-------|------|--------|
| C — `STATS WHERE state == "idle"` only                | 51.4 s | 51.2 s |
| E — C + pre-STATS `WHERE state IN ("idle", "used", "free") OR state IS NULL` | 30.9 s | 29.7 s |

That's a 1.7× server-side speedup from a pre-filter the engine could in
principle derive itself. The `WHERE state IN (...)` clause prunes ~80%
of the input stream via the inverted index on `state` *before* the
filter-in-agg operator has to scan row-by-row.

We ship the pre-filter explicitly (see `get_hosts_kpis.ts:117`):

```esql
FROM metrics-hostmetricsreceiver.otel-*
| WHERE state IN ("idle", "used", "free") OR state IS NULL
| STATS
    cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle",
    mem_used = AVG(system.memory.utilization)     WHERE state == "used",
    ...
```

(The `OR state IS NULL` half is needed because some hostmetrics signals —
load_average, logical.count — are emitted without a `state` attribute.)

**Ask:** is there a planned optimisation that derives this pre-filter
automatically from a `STATS … WHERE … in (X, Y)` aggregate?

### 5. Empty `IN ()` is a parse error

`WHERE host.name IN ()` (empty literal list) fails parsing instead of
short-circuiting to an empty result set. This bit us on the first paint
of the Hosts page before `useHostsView` resolved — Lens fired the ES|QL
query with `WHERE host.name IN ()` in the string and the whole tile
errored out.

Workaround in `esql_kpi_chart.ts:108-117`: stop inlining the host filter
in the query string entirely. Let Lens own the host filter via the
embeddable's `filters` prop (which Lens then threads through as the
`filter` parameter on the `_query` request). Same end result, no empty
list to guard against.

**Ask:** should `WHERE x IN ()` evaluate to "no rows" rather than parse
error? It would make it composable with empty filter sets.

### 6. Two-stage `STATS BY x | LIMIT | STATS` is slow at scale

We tried preserving the legacy "of N hosts" semantic by pre-aggregating
per host and then collapsing:

```esql
FROM metrics-hostmetricsreceiver.otel-*
| WHERE state IN ("idle", ...) OR state IS NULL
| STATS cpu_per_host = AVG(metrics.system.cpu.utilization) WHERE state == "idle",
        load_per_host = AVG(metrics.system.cpu.load_average.1m),
        ...
  BY host.name
| SORT host.name
| LIMIT 500
| STATS cpu_idle = AVG(cpu_per_host), load1m = AVG(load_per_host), ...
```

Bench at 5000 hosts on the same cluster (3 cold runs, median):

| Shape | Wall | `took` |
|-------|------|--------|
| F — two-stage `STATS BY host.name \| LIMIT \| STATS`        | 88.9 s | 88.7 s |
| G — single-stage `STATS` over the full fleet, no `BY`       | 47.3 s | 47.1 s |

Two-stage is ~1.9× slower than the single-stage shape. The per-host
pre-aggregation has to materialise state for all 5000 hosts before the
second STATS can collapse anything, even if the final answer only needs
the top 500. There's no apparent push-down of the `LIMIT` into the first
STATS.

We shipped the single-stage shape (G) and moved the "of N hosts"
semantic to a client-side `min(hostCount, limit)` subtitle.

**Ask:** is there a way to express "collapse to N hosts, then aggregate
across them" without paying for full-fleet pre-aggregation? Or is this
inherent to how the operator builds its partial groups?

### 7. `host.name IN (5000 names)` re-evaluates per row even after a state pre-filter

Bench at 5000 hosts:

| Shape | Wall | `took` |
|-------|------|--------|
| E — pre-filter + STATS, `WHERE host.name IN (5000 names)` inline | 51.4 s | 51.2 s |
| G — same but no inline host filter (rely on `_query.filter` instead) | 47.3 s | 47.1 s |

Small win (~10 %), but consistent — when a long `IN` list is already
satisfied by the upstream filter, threading it through the query string
adds row-by-row evaluation. The Lens embeddable filtering path (via
`_query`'s `filter` parameter) avoids this because it uses the DSL
inverted index.

**Ask:** is this a known limitation of the `IN` operator over text
fields with long lists, or expected behaviour? Either way, the practical
guidance for application code is "let the host filter ride on
`_query.filter`, not in the ES|QL string".

### 8. Library-side gap — Lens metric-viz trendline on ES|QL

Not strictly an ES|QL caveat, more a library-surface one. Recording it
because it shaped what we could ship on the P15c (Lens-ES|QL KPI)
path.

The Lens metric viz takes a primary value query and an optional second
"trendline" query for the sparkline behind the headline number. The
DSL/formula path takes a single formula expression and the library
bucketises it for the trendline layer. The ES|QL path needs a separate
bucketed query for the second layer (the data shape is fundamentally
different — `STATS x = AVG(...)` for the scalar vs
`STATS x = AVG(...) BY BUCKET(@timestamp, 5m)` for the trendline), and
`@kbn/lens-embeddable-utils` doesn't accept a second ES|QL query on
metric configs.

We prototyped adding a `trendLineDataset` field but the second layer
didn't render correctly end-to-end (the embeddable accepts the dataset
but Lens's runtime didn't render the trendline). Reverted; P15c KPIs
are trendline-less by construction
(`esql_kpi_chart.ts:166-170`).

**Ask:** is there a planned Lens API for "ES|QL metric viz with bucketed
trendline"? If yes we'd happily wire P15a (drop-trendline) and P15c
(ES|QL KPI) onto the same code path.

## Bench harness

`/tmp/hosts-perf/kpi_bench_v2.mjs` — direct `_query` against ES,
median-of-3, cold cache, parameterised by env vars (`ES_URL`, `ES_USER`,
`ES_PASS`, `INDEX`, `FROM`, `TO`, `LIMIT`, `RUNS`). Reproduces shapes
C / E / F / G / H. Numbers above are from that harness against the
deploy cluster.
