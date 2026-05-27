/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Phase 2 prep — snapshot of the semconv host-metrics ES|QL expression
// catalogue lifted from the soon-to-be-deleted Phase B handler
// (`get_hosts_metrics.ts`'s `computeSemconvIntermediateExpressions`). The
// `getHostsEsql` spike in Phase 2 of the host-endpoint PoC re-uses this
// catalogue to swap the legacy `getAllHosts` DSL aggregations for a single
// ES|QL `STATS … BY host.name` query without re-deriving the per-state
// filter-in-agg expressions from scratch.
//
// Nothing in the file is imported yet — it is dead code until Phase 2.
// Keep it minimal: only the catalogue itself + the `esqlAlias` helper that
// guards against metric names that aren't valid ES|QL identifiers
// (e.g. `cpuV2` is fine; future metrics with dots or leading digits would
// fall through the regex to the `metric_<name>` mangle).
//
// Source choice rationale (carried over verbatim from the original
// implementation so the Phase 2 author has the context):
//   - `FROM` is used instead of `TS`. `TS` is the natural fit for the
//     per-time-series `*_OVER_TIME` / `RATE` semantics but the engine
//     currently rejects filter-in-aggregation expressions inside a `TS`
//     pipeline ("unexpected inline filter in time-series aggregation").
//     The semconv inventory model needs per-state filters for cpuV2 /
//     memory / memoryFree / diskSpaceUsage, so `FROM` + filter-in-agg is
//     the only shape that ports the whole inventory into a single ES|QL
//     query today.
//   - Field names that include numeric-leading segments (e.g.
//     `metrics.system.cpu.load_average.1m`) must be backtick-quoted because
//     the ES|QL parser otherwise interprets `.1m` as a time literal and
//     rejects the expression.
//   - Metrics whose ECS form has no canonical semconv equivalent (legacy
//     `cpu` / `rx` / `tx`) emit a typed NULL via the default branch so the
//     `KEEP` projection still has the column and the table renders "–".

import type { InfraEntityMetricType } from '../../../../../common/http_api/infra';

// `cpuV2` / `rxV2` etc. are valid ES|QL identifiers (alphanumeric only),
// but the helper exists so future metric names with dots or punctuation
// fall back to a mangled `metric_<name>` form instead of breaking the
// generated query.
export function esqlAlias(metric: InfraEntityMetricType): string {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(metric) ? metric : `metric_${metric}`;
}

// Translate the requested metrics into:
//   (a) one or more intermediate `STATS` columns (with filter-in-agg where
//       a per-state slice is needed) — produced once per metric and reused
//       across the EVAL stage,
//   (b) a single per-metric `EVAL` clause that recombines the intermediates
//       into the user-facing column (`cpuV2 = 1 - cpu_idle`, etc.).
export function computeSemconvIntermediateExpressions(metrics: InfraEntityMetricType[]): {
  statsClauses: string[];
  evalClauses: string[];
} {
  const statsByKey = new Map<string, string>();
  const evalClauses: string[] = [];

  const addStat = (key: string, expression: string) => {
    if (!statsByKey.has(key)) {
      statsByKey.set(key, `  ${key} = ${expression}`);
    }
  };

  for (const metric of metrics) {
    const alias = esqlAlias(metric);
    switch (metric) {
      case 'cpuV2':
        addStat('cpu_idle', 'AVG(metrics.system.cpu.utilization) WHERE state == "idle"');
        evalClauses.push(`${alias} = 1 - cpu_idle`);
        break;
      case 'memory':
        addStat('mem_used', 'AVG(system.memory.utilization) WHERE state == "used"');
        evalClauses.push(`${alias} = mem_used`);
        break;
      case 'memoryFree':
        addStat('mem_cached', 'AVG(system.memory.usage) WHERE state == "cached"');
        addStat('mem_free', 'AVG(system.memory.usage) WHERE state == "free"');
        addStat('mem_slab_unrec', 'AVG(system.memory.usage) WHERE state == "slab_unreclaimable"');
        addStat('mem_slab_rec', 'AVG(system.memory.usage) WHERE state == "slab_reclaimable"');
        evalClauses.push(`${alias} = (mem_cached + mem_free) - (mem_slab_unrec + mem_slab_rec)`);
        break;
      case 'diskSpaceUsage':
        addStat('disk_free', 'SUM(metrics.system.filesystem.usage) WHERE state == "free"');
        addStat('disk_total', 'SUM(metrics.system.filesystem.usage)');
        // `TO_DOUBLE` on both operands is load-bearing — ES|QL `SUM` of a
        // long-typed field (`filesystem.usage` is bytes) returns a long,
        // and `long / long` performs integer division. Without the cast
        // the formula evaluates to `1 - 0 = 1` (100 %) for any host where
        // free bytes are smaller than the total — i.e. essentially always.
        // Same fix the KPI ES|QL builder applies.
        evalClauses.push(
          `${alias} = CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), 0)`
        );
        break;
      case 'normalizedLoad1m':
        addStat('load1m', 'AVG(`metrics.system.cpu.load_average.1m`)');
        addStat('cores', 'MAX(metrics.system.cpu.logical.count)');
        evalClauses.push(`${alias} = load1m / cores`);
        break;
      case 'rxV2':
        addStat('rx_io', 'AVG(metrics.system.network.io) WHERE direction == "receive"');
        evalClauses.push(`${alias} = rx_io`);
        break;
      case 'txV2':
        addStat('tx_io', 'AVG(metrics.system.network.io) WHERE direction == "transmit"');
        evalClauses.push(`${alias} = tx_io`);
        break;
      // Legacy ECS-only metrics — under semconv they have no canonical
      // equivalent. Emit a typed NULL so the column still exists in the
      // KEEP projection (the table renders it as "–").
      case 'cpu':
      case 'rx':
      case 'tx':
      default:
        evalClauses.push(`${alias} = TO_DOUBLE(NULL)`);
        break;
    }
  }

  return {
    statsClauses: Array.from(statsByKey.values()),
    evalClauses,
  };
}
