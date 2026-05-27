/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P15c — dataset-swap helper for the four Hosts KPI tiles. Mirrors the
// metrics-tab helper (`esql_metrics_chart.ts`) but for `chartType: 'metric'`
// configs: it converts a Lens KPI tile so its headline value comes from an
// ES|QL `STATS` over the active host set.
//
// Trendline is intentionally not supported on this path. The Lens config
// builder (`@kbn/lens-embeddable-utils`) only knows how to bucketize a
// formula/DSL value into the second `metricTrendline` layer; an
// equivalent path for ES|QL would require teaching the library to accept
// a separate bucketed query (and was prototyped — see the now-reverted
// `trendLineDataset` field — but didn't render correctly end-to-end).
// Until that exists, every config returned here forces `trendLine: false`
// so Lens doesn't reference a missing trendline layer.
//
// Aggregation semantics: each formula is replayed as a doc-weighted
// aggregate across all matching documents in the date range and host
// filter set. That matches the legacy/main behaviour exactly — the
// "Average (of N hosts)" subtitle is a description of the host set, not a
// claim that the numerator is a per-host then per-host average. The math
// is the same `STATS AVG(field)` / `STATS SUM(field)` reduction the
// formula-based Lens charts compile to under DSL.

import type { LensConfig } from '@kbn/lens-embeddable-utils';

// Closed enumeration of the four KPI tiles rendered above the Hosts grid.
// Matches the `id` field on each inventory-model KPI metric config that
// `useHostKpiCharts()` returns.
export type HostsKpiMetric = 'cpuUsage' | 'normalizedLoad1m' | 'memoryUsage' | 'diskUsage';

const SUPPORTED_KPIS: ReadonlySet<HostsKpiMetric> = new Set([
  'cpuUsage',
  'normalizedLoad1m',
  'memoryUsage',
  'diskUsage',
]);

export const isSupportedEsqlKpi = (id: string): id is HostsKpiMetric =>
  SUPPORTED_KPIS.has(id as HostsKpiMetric);

// Lens reads the field positionally, so the headline query just needs a
// single stable output column.
const VALUE_COLUMN = 'value';

// `STATS … EVAL …` clauses that turn each inventory-model semconv formula
// into ES|QL. The formulas are simple enough to enumerate; we deliberately
// don't ingest the formula DSL because the catalogue is closed at four
// entries.
function buildKpiClauses(metric: HostsKpiMetric): { stats: string[]; evals: string[] } {
  switch (metric) {
    case 'cpuUsage':
      // semconv: `1 - average(metrics.system.cpu.utilization, kql='state: idle')`
      return {
        stats: [`cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle"`],
        evals: [`${VALUE_COLUMN} = 1 - cpu_idle`],
      };
    case 'normalizedLoad1m':
      // semconv: `average(metrics.system.cpu.load_average.1m) / max(metrics.system.cpu.logical.count)`
      return {
        stats: [
          `load1m = AVG(\`metrics.system.cpu.load_average.1m\`)`,
          `cores = MAX(metrics.system.cpu.logical.count)`,
        ],
        evals: [`${VALUE_COLUMN} = CASE(cores > 0, load1m / cores, NULL)`],
      };
    case 'memoryUsage':
      // semconv: `average(system.memory.utilization, kql='state: used')`
      return {
        stats: [`mem_used = AVG(system.memory.utilization) WHERE state == "used"`],
        evals: [`${VALUE_COLUMN} = mem_used`],
      };
    case 'diskUsage':
      // semconv: `1 - sum(metrics.system.filesystem.usage, kql='state: free') / sum(metrics.system.filesystem.usage)`
      // We replay the formula verbatim. `SUM(...) WHERE state == "free"`
      // computes the numerator; the denominator is the unfiltered `SUM`
      // because the inventory formula doesn't add a state filter to the
      // total. `CASE(total > 0, …)` mirrors Lens's implicit divide-by-zero
      // guard so empty time buckets render as `NULL` instead of failing
      // the whole query.
      //
      // `TO_DOUBLE(...)` on both operands is load-bearing — ES|QL `SUM`
      // of a long-typed field (`system.filesystem.usage` is bytes, which
      // ingests as a long) returns a long, and `long / long` performs
      // integer division. Without the cast the formula evaluates to
      // `1 - 0 = 1` (100% usage) for any host where the free byte total
      // is smaller than the overall total — i.e. essentially always,
      // which is the literal "shows 100%" symptom reported during the
      // P15c review.
      return {
        stats: [
          `fs_free = SUM(metrics.system.filesystem.usage) WHERE state == "free"`,
          `fs_total = SUM(metrics.system.filesystem.usage)`,
        ],
        evals: [
          `${VALUE_COLUMN} = CASE(fs_total > 0, 1 - (TO_DOUBLE(fs_free) / TO_DOUBLE(fs_total)), NULL)`,
        ],
      };
  }
}

// Time-range pseudo-columns let Lens substitute `?_tstart` / `?_tend` from
// the embeddable's `timeRange` prop at execute time, so the query text
// stays stable across date-range changes. Host scoping is intentionally
// **not** inlined as `WHERE host.name IN (…)` — Lens converts the KPI
// tile's `filters` prop (the `host.name` filter built in `KpiCharts`) into
// an ES|QL `filter` parameter on the `_query` request, and inlining the
// same predicate in the query string was both redundant and the only
// reason the scalar/bucketed queries needed the page's host list at build
// time. Letting Lens own the host filter also avoids a parse error when
// the page renders before `hostNodes` resolves (the previous shape
// produced `WHERE host.name IN ()`, which ES|QL rejects).
const TIME_RANGE_WHERE = `| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`;

function buildScalarQuery(metric: HostsKpiMetric): string {
  const { stats, evals } = buildKpiClauses(metric);
  const statsClause = stats.map((s) => `  ${s}`).join(',\n');
  const evalClause = evals.length ? `\n| EVAL ${evals.join(', ')}` : '';
  return `FROM metrics-hostmetricsreceiver.otel-*
${TIME_RANGE_WHERE}
| STATS
${statsClause}${evalClause}
| KEEP ${VALUE_COLUMN}`;
}

// Shape of an inventory-model KPI tile config — the relevant Lens-level
// fields (`title`, `format`, `decimals`, `subtitle`, `seriesColor`,
// `trendLine`, etc.) all live at the top of the object spread by
// `useHostKpiCharts()`. We accept and return that shape verbatim, swapping
// only `dataset` / `value` (and forcing `trendLine: false` — see the file
// header). `LensConfig` is a union across every chart type so we use a
// type alias intersection rather than `interface … extends …` —
// interfaces can't extend a union type.
type KpiChartWithId = LensConfig & { id?: string };

export function toEsqlKpiChartConfig<T extends KpiChartWithId>({
  baseChart,
  metric,
}: {
  baseChart: T;
  metric: HostsKpiMetric;
}): T {
  const scalar = buildScalarQuery(metric);

  // Preserve the inventory-model formula text from `baseChart.value` on a
  // non-Lens passthrough field. The "Formula Calculation:" tooltip rendered
  // by `LensChart` reads this via `useLensAttributes.getFormula()` and
  // falls back to `value` only when it isn't set — which means the
  // ES|QL-backed tile renders the same human-readable formula
  // (e.g. `1 - average(metrics.system.cpu.utilization, kql='state: idle')`)
  // the DSL/formula path does, instead of the bare ES|QL column name
  // (`'value'`) the overwrite below would otherwise surface. Lens itself
  // ignores the field — it's a private extension.
  const displayFormula = (baseChart as { value?: unknown }).value;

  // Cast through `unknown` because TS only knows `T extends LensConfig` and
  // the union doesn't narrow to the metric branch from `chartType: 'metric'`
  // at this call site — the runtime constraint (KPI tiles are always
  // `chartType: 'metric'`) is enforced by `useHostKpiCharts()` upstream.
  //
  // `trendLine: false` is unconditional: the library can't render an
  // ES|QL-backed trendline (see the file header), so we strip the flag
  // even when the caller wired `kpiTrendline` on. The DSL path still
  // honours `kpiTrendline` because it never reaches this helper.
  return {
    ...baseChart,
    dataset: { esql: scalar },
    value: VALUE_COLUMN,
    ...(typeof displayFormula === 'string' ? { displayFormula } : {}),
    trendLine: false,
  } as unknown as T;
}
