/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P16-A — dataset-swap helper that turns the inventory model's DSL/formula
// xy chart config into an ES|QL xy chart config without rebuilding the
// chrome (title, legend, ybounds, fittingFunction, reference layers all
// flow through from the inventory model).
//
// The shape we accept is exactly what `useMetricsCharts()` returns: each
// chart is a Lens xy config with a single `type: 'series'` layer whose
// `yAxis: [formula]` is one entry from the inventory's formula catalogue.
// The catalogue carries `{ label, format, decimals }` per formula and we
// preserve those values on the ES|QL column reference so the chart's
// tooltip, legend, and axis formatting are identical between the two
// paths.
//
// Counter metrics (rx, tx, diskIO*, diskThroughput*) are rendered as
// per-second rates via `(MAX - MIN) / bucket_seconds`. The counter is
// monotonically increasing inside a bucket, so `MAX - MIN` is the delta
// over the bucket window. Dividing by the bucket length (in seconds,
// supplied by the caller through `spanSeconds`) yields the
// `normalizeByUnit: 's'` rate the inventory model's DSL formula
// produces with `counter_rate(...)`. We can't use ES|QL `RATE()` here
// because it only runs inside a `TS` pipeline, and `TS` today rejects
// the `WHERE` filter-in-aggregation we need to split read/write and
// receive/transmit directions.
//
// rx / tx multiply by 8 to convert bytes → bits, matching the inventory
// model's `8 * counter_rate(max(system.network.io))` formula.
//
// Counter type cast: ES|QL `MAX` / `MIN` reject `counter_long` /
// `counter_double` fields with "argument must be … numeric except
// counter types". The OTel host metrics ingest network and disk I/O as
// counter types, so a literal `MAX(system.disk.operations)` fails
// verification. Wrapping in `TO_DOUBLE(...)` drops the counter semantics
// without changing the value.

import { HOST_NAME_FIELD } from '../../../../../../../common/constants';

// Closed enumeration of the 11 metrics rendered in the Metrics tab —
// matches the `id` field on each inventory chart returned by
// `useMetricsCharts()`.
export type HostsTimeseriesMetric =
  | 'cpuUsage'
  | 'normalizedLoad1m'
  | 'memoryUsage'
  | 'memoryFree'
  | 'diskSpaceAvailable'
  | 'diskIORead'
  | 'diskIOWrite'
  | 'diskReadThroughput'
  | 'diskWriteThroughput'
  | 'rx'
  | 'tx';

const SUPPORTED_METRICS: ReadonlySet<HostsTimeseriesMetric> = new Set([
  'cpuUsage',
  'normalizedLoad1m',
  'memoryUsage',
  'memoryFree',
  'diskSpaceAvailable',
  'diskIORead',
  'diskIOWrite',
  'diskReadThroughput',
  'diskWriteThroughput',
  'rx',
  'tx',
]);

export const isSupportedEsqlMetric = (id: string): id is HostsTimeseriesMetric =>
  SUPPORTED_METRICS.has(id as HostsTimeseriesMetric);

// Per-metric output column that the chart's y-axis binds to once the data
// arrives. Every metric — including the counter-derived ones — finishes
// in an `EVAL` so the column matches the chart's expected label
// (e.g. `cpuUsage` instead of `cpu_idle`, `diskIORead` instead of
// `diskIORead_max`).
const Y_AXIS_COLUMN: Record<HostsTimeseriesMetric, string> = {
  cpuUsage: 'cpuUsage',
  normalizedLoad1m: 'normalizedLoad1m',
  memoryUsage: 'memoryUsage',
  memoryFree: 'memoryFree',
  diskSpaceAvailable: 'diskSpaceAvailable',
  diskIORead: 'diskIORead',
  diskIOWrite: 'diskIOWrite',
  diskReadThroughput: 'diskReadThroughput',
  diskWriteThroughput: 'diskWriteThroughput',
  rx: 'rx',
  tx: 'tx',
};

// `STATS … EVAL …` clauses for each metric, mirroring the inventory
// model's semconv formulas. The expressions are simple enough that
// keeping a hand-rolled map is clearer than building an interpreter for
// the formula DSL — the catalogue is closed at 11 entries.
//
// `spanSeconds` is the bucket length in seconds (derived from
// `autoBucketSpan` via `bucketSpanSeconds`). It only matters for the
// counter-rate metrics (rx, tx, diskIO*, diskThroughput*); the other
// metrics ignore it.
function buildClauses(
  metric: HostsTimeseriesMetric,
  spanSeconds: number
): { stats: string[]; evals: string[] } {
  // `MAX(counter) - MIN(counter)` is the operation/byte delta over the
  // bucket window for a monotonically-increasing counter. Dividing by
  // `spanSeconds` gives the per-second rate that the inventory model's
  // DSL `counter_rate(max(field, kql='direction: x'))` produces.
  const rateClause = (field: string, direction: 'read' | 'write' | 'receive' | 'transmit') => ({
    stats: [
      `${direction}_max = MAX(TO_DOUBLE(${field})) WHERE attributes.direction == "${direction}"`,
      `${direction}_min = MIN(TO_DOUBLE(${field})) WHERE attributes.direction == "${direction}"`,
    ],
  });

  switch (metric) {
    case 'cpuUsage':
      return {
        stats: [`cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle"`],
        evals: [`cpuUsage = 1 - cpu_idle`],
      };
    case 'normalizedLoad1m':
      return {
        stats: [
          `load1m = AVG(\`metrics.system.cpu.load_average.1m\`)`,
          `cores = MAX(metrics.system.cpu.logical.count)`,
        ],
        evals: [`normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)`],
      };
    case 'memoryUsage':
      return {
        stats: [`mem_used = AVG(system.memory.utilization) WHERE state == "used"`],
        evals: [`memoryUsage = mem_used`],
      };
    case 'memoryFree':
      return {
        stats: [
          `mem_free_max = MAX(metrics.system.memory.usage) WHERE state == "free"`,
          `mem_cached_max = MAX(metrics.system.memory.usage) WHERE state == "cached"`,
          `mem_slab_un_avg = AVG(metrics.system.memory.usage) WHERE state == "slab_unreclaimable"`,
          `mem_slab_re_avg = AVG(metrics.system.memory.usage) WHERE state == "slab_reclaimable"`,
        ],
        evals: [
          `memoryFree = (mem_free_max + mem_cached_max) - (mem_slab_un_avg + mem_slab_re_avg)`,
        ],
      };
    case 'diskSpaceAvailable':
      return {
        stats: [`disk_free_avg = AVG(system.filesystem.usage) WHERE state == "free"`],
        evals: [`diskSpaceAvailable = disk_free_avg`],
      };
    case 'diskIORead': {
      const { stats } = rateClause('system.disk.operations', 'read');
      return {
        stats,
        evals: [`diskIORead = (read_max - read_min) / ${spanSeconds}`],
      };
    }
    case 'diskIOWrite': {
      const { stats } = rateClause('system.disk.operations', 'write');
      return {
        stats,
        evals: [`diskIOWrite = (write_max - write_min) / ${spanSeconds}`],
      };
    }
    case 'diskReadThroughput': {
      const { stats } = rateClause('system.disk.io', 'read');
      return {
        stats,
        evals: [`diskReadThroughput = (read_max - read_min) / ${spanSeconds}`],
      };
    }
    case 'diskWriteThroughput': {
      const { stats } = rateClause('system.disk.io', 'write');
      return {
        stats,
        evals: [`diskWriteThroughput = (write_max - write_min) / ${spanSeconds}`],
      };
    }
    case 'rx': {
      const { stats } = rateClause('metrics.system.network.io', 'receive');
      return {
        stats,
        // bytes/s × 8 → bits/s, matching the inventory model's
        // `8 * counter_rate(...)` formula.
        evals: [`rx = 8 * (receive_max - receive_min) / ${spanSeconds}`],
      };
    }
    case 'tx': {
      const { stats } = rateClause('metrics.system.network.io', 'transmit');
      return {
        stats,
        evals: [`tx = 8 * (transmit_max - transmit_min) / ${spanSeconds}`],
      };
    }
  }
}

export function buildEsqlMetricsQuery({
  metric,
  names,
  span,
  spanSeconds,
}: {
  metric: HostsTimeseriesMetric;
  names: string[];
  span: string;
  spanSeconds: number;
}): string {
  const nameList = names.map((n) => JSON.stringify(n)).join(', ');
  const { stats, evals } = buildClauses(metric, spanSeconds);
  const yColumn = Y_AXIS_COLUMN[metric];

  const statsClause = stats.map((s) => `  ${s}`).join(',\n');
  const evalClause = evals.length ? `\n| EVAL ${evals.join(', ')}` : '';

  // Lens substitutes `?_tstart` / `?_tend` from the embeddable's
  // `timeRange` prop at execution time, so the query string itself stays
  // stable across date-range changes (only the host list / metric / span
  // force a rebuild). Same pattern Discover's ES|QL charts use.
  return `FROM metrics-hostmetricsreceiver.otel-*
| WHERE ${HOST_NAME_FIELD} IN (${nameList})
| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend
| STATS
${statsClause}
  BY ${HOST_NAME_FIELD}, bucket = BUCKET(@timestamp, ${span})${evalClause}
| KEEP ${HOST_NAME_FIELD}, bucket, ${yColumn}
| SORT ${HOST_NAME_FIELD}, bucket`;
}

// Shape of an inventory-model series layer's yAxis entry — the relevant
// fields are the visual annotations we need to preserve when swapping the
// formula reference for an ES|QL column reference. `normalizeByUnit` and
// `suffix` are forwarded because `mapToValueFormat` in
// `kbn-lens-embeddable-utils/config_builder/utils.ts` translates them to
// a `params.suffix` on the text-based column's format. The DSL/formula
// path uses Lens's `timeScale` plumbing for the same effect, but
// `TextBasedLayerColumn` has no `timeScale` field of its own, so
// surfacing the unit as a format suffix is the only way to render `/s`
// on counter-rate metrics (IOPS, throughput, network bits/s).
interface FormulaAnnotations {
  label?: string;
  format?: 'bits' | 'bytes' | 'currency' | 'duration' | 'number' | 'percent' | 'string';
  decimals?: number;
  normalizeByUnit?: 's' | 'm' | 'h' | 'd';
  suffix?: string;
}

// Shape we accept and return. The inventory model's xy chart configs are
// `LensXYConfig`, but typing the helper against a generic `T` constrained
// to "anything with a `layers` array" lets us preserve the caller's exact
// chart shape (so `useMetricsCharts`'s downstream consumers don't have to
// re-narrow the union). The runtime contract is unchanged: we copy the
// chart, set `dataset` to ES|QL, and rewrite the `series` layer.
interface ChartWithLayers {
  id?: string;
  layers: any[];
  dataset?: unknown;
}

// Mutate-by-copy a Lens chart config so its data source is ES|QL instead
// of DSL/formula. Reference layers (e.g. the `y = 1` line on the CPU
// chart) pass through untouched because they don't depend on the data
// source. The series layer's `xAxis`, `yAxis`, and `breakdown` are all
// rewritten to refer to the ES|QL output columns.
//
// We keep the original chart's `title`, `legend`, `yBounds`,
// `fittingFunction`, and any axis-visibility flags so the chart looks
// identical between DSL and ES|QL modes — only the data source changes.
export function toEsqlMetricsChartConfig<T extends ChartWithLayers>({
  baseChart,
  metric,
  names,
  span,
  spanSeconds,
}: {
  baseChart: T;
  metric: HostsTimeseriesMetric;
  names: string[];
  span: string;
  spanSeconds: number;
}): T {
  const query = buildEsqlMetricsQuery({ metric, names, span, spanSeconds });
  const yColumn = Y_AXIS_COLUMN[metric];

  // Reference layers (`y = 1` guide on cpuUsage / normalizedLoad1m /
  // memoryUsage) are dropped on the ES|QL path. The inventory model
  // expresses them as `yAxis: [{ value: '1' }]` and the library's XY
  // builder feeds that straight into `getValueColumn(..., '1', 'number')`
  // for text-based datasets, producing a column whose `fieldName` is the
  // literal `'1'`. ES|QL has no such column, so Lens errors out with
  // "Provided column name or index is invalid: metric_formula_accessor1_0"
  // and the whole tile fails to render. The library would need a literal
  // / static-value path for text-based layers to fix this properly;
  // until then, filtering reference layers here keeps the chart working
  // at the cost of the dashed guideline — a deliberate, scoped tradeoff
  // for the P16-A PoC.
  // Capture the inventory-model formula expression off the first
  // series layer's yAxis BEFORE we rewrite `value` to the ES|QL output
  // column. The "Formula Calculation:" tooltip rendered by `LensChart`
  // reads `useLensAttributes.getFormula()`, which checks the chart-level
  // `displayFormula` passthrough first — stashing the original formula
  // here keeps the popover content identical between the DSL and ES|QL
  // paths (e.g. `1 - average(metrics.system.cpu.utilization, kql='state: idle')`
  // instead of the bare column name `cpuUsage`). Lens itself ignores the
  // field; it's a private extension read only by the infra plugin.
  const firstSeriesLayer = baseChart.layers.find((layer) => layer.type === 'series');
  const displayFormula = firstSeriesLayer?.yAxis?.[0]?.value;

  const swappedLayers = baseChart.layers
    .filter((layer) => layer.type === 'series')
    .map((layer) => {
      // The inventory model only puts one formula entry per Metrics-tab
      // tile (the multi-series breakdown variants like `cpuUsageBreakdown`
      // aren't included in `useMetricsCharts()`'s shortlist), so we read
      // annotations off the first yAxis entry.
      const formula = (layer.yAxis?.[0] ?? {}) as FormulaAnnotations;
      return {
        ...layer,
        xAxis: 'bucket',
        breakdown: HOST_NAME_FIELD,
        yAxis: [
          {
            value: yColumn,
            ...(formula.label !== undefined ? { label: formula.label } : {}),
            ...(formula.format !== undefined ? { format: formula.format } : {}),
            ...(formula.decimals !== undefined ? { decimals: formula.decimals } : {}),
            ...(formula.normalizeByUnit !== undefined
              ? { normalizeByUnit: formula.normalizeByUnit }
              : {}),
            ...(formula.suffix !== undefined ? { suffix: formula.suffix } : {}),
          },
        ],
      };
    });

  return {
    ...baseChart,
    dataset: { esql: query },
    layers: swappedLayers,
    ...(typeof displayFormula === 'string' ? { displayFormula } : {}),
  } as T;
}
