/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canCompileMatchMetric } from './can_compile_match_metric';
import {
  METRIC_SERIES_BUCKET_FIELD,
  METRIC_SERIES_CLOSED_BUCKETS,
  METRIC_SERIES_LIMIT,
  METRIC_SERIES_VALUE_FIELD,
} from './metric_series_contract';

/**
 * Compiles a filter-only MATCH KI into an Alerting v2 breach query that emits
 * closed-minute `{ bucket, metric_value }` rows (COUNT(*)).
 *
 * Time scoping for source docs comes from the rule engine lookback filter on
 * `time_field`. The in-query `DATE_TRUNC(NOW())` drops the open current minute.
 */
export function compileMatchCountBreachQuery(esqlQuery: string, timestampField: string): string {
  const base = esqlQuery.trim();
  if (!canCompileMatchMetric(base)) {
    throw new Error(
      'MATCH query cannot be installed as a metric-series rule: expected a filter-only FROM … | WHERE … query (no STATS) that parses cleanly. Refusing to install a per-document copy rule.'
    );
  }

  // Keep `bucket` as a datetime (no TO_LONG here). Alerting persists the ES|QL
  // date value; readers project with TO_DATETIME(TO_LONG(FIELD_EXTRACT(...))).
  //
  // The window is bounded on both sides against the same DATE_TRUNC(NOW()):
  // the upper bound drops the open current minute, the lower bound drops the
  // oldest minute of the engine's LOOKBACK, which the run only covers in part.
  // Emitting that partial minute would store an undercount that no later run
  // revisits. The bound never reaches past the engine window because
  // `floor(NOW()) - CLOSED_BUCKETS ≥ NOW() - LOOKBACK` for any run time.
  //
  // With EVERY=5m and LOOKBACK=7m that leaves 6 fully covered closed minutes,
  // one of which intentionally overlaps the previous run (see
  // metric_series_contract.ts). SORT DESC + LIMIT is then only a safety cap.
  //
  // Join with `\n| ` so a KI ending in a `//` line comment cannot swallow the
  // pipe that starts the first appended command.
  return [
    base,
    `STATS ${METRIC_SERIES_VALUE_FIELD} = COUNT(*) BY ${METRIC_SERIES_BUCKET_FIELD} = BUCKET(${timestampField}, 1 minute)`,
    `WHERE ${METRIC_SERIES_BUCKET_FIELD} < DATE_TRUNC(1 minute, NOW()) AND ${METRIC_SERIES_BUCKET_FIELD} >= DATE_TRUNC(1 minute, NOW()) - ${METRIC_SERIES_CLOSED_BUCKETS} minutes`,
    `KEEP ${METRIC_SERIES_BUCKET_FIELD}, ${METRIC_SERIES_VALUE_FIELD}`,
    `SORT ${METRIC_SERIES_BUCKET_FIELD} DESC`,
    `LIMIT ${METRIC_SERIES_LIMIT}`,
  ].join('\n| ');
}
