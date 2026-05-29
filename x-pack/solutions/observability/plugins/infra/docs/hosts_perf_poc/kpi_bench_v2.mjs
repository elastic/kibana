#!/usr/bin/env node
// KPI bench, v2 — matches the production wire shape and adds variants
// that isolate the per-row "filter-in-aggregation" cost vs the inline
// `WHERE host.name IN (…)` cost so we can understand why P15b is closer
// to the legacy path on this cluster than it was on the earlier
// synthtrace fixture.
//
// Five scenarios over the same `host.name` set + window:
//
//   A. legacy with trendline (Lens DSL) — 4 parallel _search.
//      Each `_search` has:
//          query.bool.filter: [terms(host.name), range(@timestamp)]
//          aggs.scalar = { filter: term(state=...), aggs: { value: avg(...) } }
//          aggs.trend  = date_histogram(value: avg(...))
//      i.e. `state` is a sub-aggregation filter — uses inverted index.
//
//   B. P15a — same as A without `aggs.trend`. Drops the trendline only.
//
//   C. P15b inline (current handler) — 1 ES|QL `_query`.
//          query: `FROM …
//                  | WHERE host.name IN (n1, n2, …)
//                  | STATS  cpu = AVG(...) WHERE state == "idle",
//                          mem = AVG(...) WHERE state == "used",
//                          disk_free = SUM(...) WHERE state == "free",
//                          disk_total = SUM(...),
//                          load = AVG(...),
//                          cores = MAX(...)
//                          | EVAL ...`
//          filter: { bool: { filter: [range(@timestamp)] } }
//      Matches `getHostsKpis` semconv branch exactly: time range in the
//      request `filter` parameter, host scoping inline. Filter-in-agg
//      (`WHERE state == "idle"`) is the ES|QL operator that *cannot*
//      use the inverted index on `state` — it scans every row of the
//      pipeline.
//
//   D. P15b ALL-in-request-filter — 1 ES|QL `_query`.
//      Same STATS pipeline as C, but BOTH host scoping AND time range
//      come from the request `filter`. This is what `P15c` (Lens ES|QL
//      KPI tiles) does via the embeddable's `filters` prop — Lens emits
//      `filter: { terms: { host.name: [...] } }` on the request and
//      leaves the ES|QL pipeline empty of `WHERE` clauses. Tests whether
//      the inline `IN (n×5000)` clause is what's slowing C down.
//
//   E. P15b pre-STATS state filter — 1 ES|QL `_query`.
//      Adds an early `| WHERE state IN ("idle", "used", "free")` before
//      `STATS`. With `state` indexed (inverted index on a keyword
//      attribute) this could in principle let the engine prune docs
//      before the STATS pipeline scans them. If E is faster than C, the
//      filter-in-agg row-by-row evaluation is the bottleneck; if not,
//      the bottleneck is somewhere else.

import { performance } from 'node:perf_hooks';

const ES = process.env.ES_URL ?? 'http://localhost:9200';
const USER = process.env.ES_USER ?? 'elastic';
const PASS = process.env.ES_PASS ?? 'changeme';
const INDEX = process.env.INDEX ?? 'metrics-hostmetricsreceiver.otel-*';
const FROM = process.env.FROM ?? '2026-05-26T15:28:00Z';
const TO = process.env.TO ?? '2026-05-26T16:00:00Z';
const LIMIT = Number(process.env.LIMIT ?? 5000);
const RUNS = Number(process.env.RUNS ?? 5);

const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

async function esJson(path, body, { method = 'POST' } = {}) {
  const start = performance.now();
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const elapsed = performance.now() - start;
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0, 400)}`);
  return { elapsed, body: JSON.parse(text) };
}

async function clearCache() {
  await fetch(`${ES}/_cache/clear?request=true&query=true&fielddata=true`, {
    method: 'POST',
    headers: { Authorization: AUTH },
  }).catch(() => undefined);
}

async function fetchHostNames() {
  const { body } = await esJson(`/${INDEX}/_search`, {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ range: { '@timestamp': { gte: FROM, lte: TO } } }],
      },
    },
    aggs: { names: { terms: { field: 'host.name', size: LIMIT, order: { _key: 'asc' } } } },
  });
  return body.aggregations.names.buckets.map((b) => b.key);
}

const TRENDLINE_BUCKETS = 30;
const TRENDLINE_INTERVAL = `${Math.max(
  1,
  Math.round((new Date(TO) - new Date(FROM)) / 1000 / 60 / TRENDLINE_BUCKETS)
)}m`;

function buildLegacyKpiQuery({ names, metricAgg, withTrendLine }) {
  return {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          { terms: { 'host.name': names } },
          { range: { '@timestamp': { gte: FROM, lte: TO } } },
        ],
      },
    },
    aggs: {
      scalar: metricAgg,
      ...(withTrendLine
        ? {
            trend: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: TRENDLINE_INTERVAL,
                min_doc_count: 0,
                extended_bounds: {
                  min: new Date(FROM).getTime(),
                  max: new Date(TO).getTime(),
                },
              },
              aggs: { value: metricAgg },
            },
          }
        : {}),
    },
  };
}

function kpiMetricAggs() {
  return {
    cpuUsage: {
      filter: { term: { state: 'idle' } },
      aggs: { value: { avg: { field: 'metrics.system.cpu.utilization' } } },
    },
    normalizedLoad1m: {
      avg: { field: 'metrics.system.cpu.load_average.1m' },
    },
    memoryUsage: {
      filter: { term: { state: 'used' } },
      aggs: { value: { avg: { field: 'system.memory.utilization' } } },
    },
    diskUsage: {
      filter: { term: { state: 'free' } },
      aggs: { value: { sum: { field: 'metrics.system.filesystem.usage' } } },
    },
  };
}

async function scenarioLegacy({ names, withTrendLine }) {
  const aggs = kpiMetricAggs();
  const start = performance.now();
  const responses = await Promise.all(
    Object.values(aggs).map((agg) =>
      esJson(`/${INDEX}/_search`, buildLegacyKpiQuery({ names, metricAgg: agg, withTrendLine }))
    )
  );
  const wall = performance.now() - start;
  const tookSum = responses.reduce((sum, r) => sum + (r.body.took ?? 0), 0);
  return { wall, took_sum: tookSum };
}

// ES|QL variants. The STATS pipeline is identical across C / D / E.

const STATS_BODY = `STATS
    cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle",
    load1m = AVG(\`metrics.system.cpu.load_average.1m\`),
    cores = MAX(metrics.system.cpu.logical.count),
    mem_used = AVG(system.memory.utilization) WHERE state == "used",
    disk_free = SUM(metrics.system.filesystem.usage) WHERE state == "free",
    disk_total = SUM(metrics.system.filesystem.usage),
    host_count = COUNT_DISTINCT(host.name)
| EVAL
    cpuUsage = 1 - cpu_idle,
    normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL),
    memoryUsage = mem_used,
    diskUsage = CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), NULL)
| KEEP cpuUsage, normalizedLoad1m, memoryUsage, diskUsage, host_count`;

function esqlInlineHostNames(names) {
  // C — current `getHostsKpis` handler shape: host inline, time range in
  // request filter.
  const nameList = names.map((n) => JSON.stringify(n)).join(', ');
  return {
    query: `FROM ${INDEX}
| WHERE host.name IN (${nameList})
| ${STATS_BODY}`,
    filter: {
      bool: { filter: [{ range: { '@timestamp': { gte: FROM, lte: TO } } }] },
    },
  };
}

function esqlAllRequestFilter(names) {
  // D — host scoping AND time range via request `filter`. ES|QL pipeline
  // sees no `WHERE` at all. Mirrors the P15c Lens path.
  return {
    query: `FROM ${INDEX}
| ${STATS_BODY}`,
    filter: {
      bool: {
        filter: [
          { terms: { 'host.name': names } },
          { range: { '@timestamp': { gte: FROM, lte: TO } } },
        ],
      },
    },
  };
}

function esqlPreStatsStateFilter(names) {
  // E — like C, but add a `| WHERE state IN (...)` *before* STATS so the
  // engine can prune docs at the shard level using the inverted index on
  // `state` rather than evaluating filter-in-agg row by row.
  const nameList = names.map((n) => JSON.stringify(n)).join(', ');
  return {
    query: `FROM ${INDEX}
| WHERE host.name IN (${nameList})
| WHERE state IN ("idle", "used", "free") OR state IS NULL
| ${STATS_BODY}`,
    filter: {
      bool: { filter: [{ range: { '@timestamp': { gte: FROM, lte: TO } } }] },
    },
  };
}

// F — Final P15b shape proposed in the PR.
// No inline `WHERE host.name IN (…)` (no need to wait for /host to
// resolve names). Two-stage STATS:
//   - inner `STATS … BY host.name` materialises per-host slices via
//     filter-in-agg
//   - `SORT host.name ASC | LIMIT N` matches the legacy host endpoint
//     ranking so both endpoints converge on the same N hosts
//   - outer `STATS` collapses to fleet-level averages over those N
//   - early `WHERE state IN (…)` lets the engine prune via the inverted
//     index on `state` (scenario E's win).
function esqlTwoStageStats() {
  return {
    query: `FROM ${INDEX}
| WHERE state IN ("idle", "used", "free") OR state IS NULL
| STATS
    cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle",
    load1m = AVG(\`metrics.system.cpu.load_average.1m\`),
    cores = MAX(metrics.system.cpu.logical.count),
    mem_used = AVG(system.memory.utilization) WHERE state == "used",
    disk_free = SUM(metrics.system.filesystem.usage) WHERE state == "free",
    disk_total = SUM(metrics.system.filesystem.usage)
  BY host.name
| SORT host.name ASC
| LIMIT ${LIMIT}
| STATS
    cpuUsage = AVG(1 - cpu_idle),
    normalizedLoad1m = AVG(CASE(cores > 0, load1m / cores, NULL)),
    memoryUsage = AVG(mem_used),
    diskUsage = AVG(CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), NULL)),
    host_count = COUNT(*)
| KEEP cpuUsage, normalizedLoad1m, memoryUsage, diskUsage, host_count`,
    filter: {
      bool: { filter: [{ range: { '@timestamp': { gte: FROM, lte: TO } } }] },
    },
  };
}

async function scenarioEsql(builder, names) {
  const start = performance.now();
  const { body } = await esJson('/_query', builder(names));
  const wall = performance.now() - start;
  return { wall, took_sum: body.took ?? wall };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m];
}

async function runScenario(label, fn) {
  console.log(`\n--- ${label} ---`);
  const wall = [];
  const took = [];
  for (let i = 0; i < RUNS; i++) {
    await clearCache();
    const r = await fn();
    wall.push(r.wall);
    took.push(r.took_sum);
    process.stdout.write(
      `  run ${i + 1}: wall=${r.wall.toFixed(0)}ms  ES took_sum=${r.took_sum.toFixed(0)}ms\n`
    );
  }
  return { wallMedian: median(wall), tookMedian: median(took) };
}

console.log(`ES endpoint   : ${ES.replace(/https?:\/\//, '').replace(/:\d+$/, '')}`);
console.log(`Date range    : ${FROM} → ${TO}`);
console.log(`Hosts (limit) : ${LIMIT}`);
console.log(`Runs / scenario: ${RUNS}`);
console.log(`Trendline interval (Scenario A): ${TRENDLINE_INTERVAL}`);

const names = await fetchHostNames();
if (names.length === 0) throw new Error('No host names returned for FROM/TO window.');
console.log(`Host names fetched: ${names.length}`);

await clearCache();
await scenarioLegacy({ names, withTrendLine: true }).catch(() => undefined);
await scenarioLegacy({ names, withTrendLine: false }).catch(() => undefined);
await scenarioEsql(esqlInlineHostNames, names).catch(() => undefined);
await scenarioEsql(esqlAllRequestFilter, names).catch(() => undefined);
await scenarioEsql(esqlPreStatsStateFilter, names).catch(() => undefined);
await scenarioEsql(esqlTwoStageStats, names).catch(() => undefined);

const a = await runScenario('A: legacy w/ trendline (4× parallel DSL)', () =>
  scenarioLegacy({ names, withTrendLine: true })
);
const b = await runScenario('B: P15a — no trendline (4× parallel DSL)', () =>
  scenarioLegacy({ names, withTrendLine: false })
);
const c = await runScenario('C: P15b — host.name IN inline (current handler)', () =>
  scenarioEsql(esqlInlineHostNames, names)
);
const d = await runScenario('D: P15b — host.name in request filter (P15c shape)', () =>
  scenarioEsql(esqlAllRequestFilter, names)
);
const e = await runScenario('E: P15b — host.name inline + pre-STATS WHERE state IN (...)', () =>
  scenarioEsql(esqlPreStatsStateFilter, names)
);
const f = await runScenario('F: P15b — two-stage STATS BY host.name | SORT | LIMIT (final)', () =>
  scenarioEsql(esqlTwoStageStats, names)
);

console.log('\n--- summary (median across cold runs) ---');
const rows = [
  ['A. legacy (trendline)        ', a],
  ['B. P15a (no trendline)       ', b],
  ['C. P15b inline IN            ', c],
  ['D. P15b request-filter       ', d],
  ['E. P15b inline + state-WHERE ', e],
  ['F. P15b two-stage (final)    ', f],
];
for (const [label, m] of rows) {
  console.log(
    `${label}: wall=${m.wallMedian.toFixed(0).padStart(6)}ms   ES took=${m.tookMedian.toFixed(0).padStart(6)}ms`
  );
}

const pct = (from, to) => (((from - to) / from) * 100).toFixed(1);
console.log();
console.log(`P15a saving vs legacy:                 wall ${pct(a.wallMedian, b.wallMedian)}%   ES took ${pct(a.tookMedian, b.tookMedian)}%`);
console.log(`P15b inline saving vs legacy:          wall ${pct(a.wallMedian, c.wallMedian)}%   ES took ${pct(a.tookMedian, c.tookMedian)}%`);
console.log(`P15b request-filter saving vs legacy:  wall ${pct(a.wallMedian, d.wallMedian)}%   ES took ${pct(a.tookMedian, d.tookMedian)}%`);
console.log(`P15b state-WHERE saving vs legacy:     wall ${pct(a.wallMedian, e.wallMedian)}%   ES took ${pct(a.tookMedian, e.tookMedian)}%`);
console.log(`P15b request-filter saving vs C (inline IN): wall ${pct(c.wallMedian, d.wallMedian)}%   ES took ${pct(c.tookMedian, d.tookMedian)}%`);
console.log(`P15b two-stage (final) saving vs legacy:     wall ${pct(a.wallMedian, f.wallMedian)}%   ES took ${pct(a.tookMedian, f.tookMedian)}%`);
console.log(`P15b two-stage (final) saving vs C inline:   wall ${pct(c.wallMedian, f.wallMedian)}%   ES took ${pct(c.tookMedian, f.tookMedian)}%`);
