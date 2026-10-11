/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from './time_range';
import type { ComparisonWindow } from './tile_time_window';
import { buildSampleTail, type TileCountQueryOptions } from './query_options';

/**
 * Builds an ES|QL query that counts entities whose risk score rose by ≥10 points
 * comparing the current score to the score at the N-period boundary.
 *
 * Approach: label each doc as "current" (after the boundary) or "boundary" (at or before it),
 * then use LAST(score, @timestamp) per (entity, period) to get the score from the most recent
 * scoring run in each half. A second STATS pivots those into two columns for comparison.
 * LAST() is used (not MAX) so we compare actual score snapshots — not the highest score seen
 * within each window. This mirrors the pattern used in reset_to_zero.ts.
 *
 * The fetch window is period + 2h buffer to ensure at least one scoring run is captured on
 * each side of the boundary even if the engine ran slightly late.
 *
 * SET unmapped_fields="nullify" prevents errors when only some entity types are
 * present in the index (e.g. only host docs → user.name is not in the mapping).
 *
 * Use `riskMoversWindow(timeRange)` for the current period and
 * `riskMoversPrevWindow(timeRange)` for the previous period, then pass the result
 * to `buildRiskMoversCountQuery`.
 */

const TIME_RANGE_TO_ESQL: Record<TimeRange, { fetchWindow: string; period: string }> = {
  '24h': { fetchWindow: '26h', period: '24h' },
  '7d': { fetchWindow: '170h', period: '7d' }, // 7*24 + 2 = 170h
  '30d': { fetchWindow: '722h', period: '30d' }, // 30*24 + 2 = 722h
};

const PREV_TIME_RANGE_TO_ESQL: Record<
  TimeRange,
  { prevFetchWindow: string; prevBoundary: string; upperBound: string }
> = {
  '24h': { prevFetchWindow: '50h', prevBoundary: '48h', upperBound: '24h' },
  '7d': { prevFetchWindow: '338h', prevBoundary: '336h', upperBound: '168h' },
  '30d': { prevFetchWindow: '1442h', prevBoundary: '1440h', upperBound: '720h' },
};

/** Returns the time window for the current period of the risk movers query. */
export const riskMoversWindow = (timeRange: TimeRange = '24h'): ComparisonWindow => {
  const { fetchWindow, period } = TIME_RANGE_TO_ESQL[timeRange];
  return { fetchWindow, boundary: period };
};

/** Returns the time window for the previous period of the risk movers query. */
export const riskMoversPrevWindow = (timeRange: TimeRange = '24h'): ComparisonWindow => {
  const { prevFetchWindow, prevBoundary, upperBound } = PREV_TIME_RANGE_TO_ESQL[timeRange];
  return { fetchWindow: prevFetchWindow, boundary: prevBoundary, upperBound };
};

export const buildRiskMoversCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  window: ComparisonWindow = riskMoversWindow(),
  entityFilterClauses: string[] = [],
  { includeIds = true, sampleLimit, riskMoversBaseline = 'boundary' }: TileCountQueryOptions = {}
): string => {
  const index = `risk-score.risk-score-${spaceId}`;
  const upperBoundClause = window.upperBound
    ? ` AND @timestamp < NOW() - ${window.upperBound}`
    : '';
  return [
    `SET unmapped_fields="nullify";`,
    `FROM ${index}`,
    `| WHERE @timestamp >= NOW() - ${window.fetchWindow}${upperBoundClause}`,
    `| EVAL entity_euid = COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`,
    `| EVAL risk_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
    `| WHERE entity_euid IS NOT NULL`,
    ...(riskMoversBaseline === 'earliest'
      ? [
          `| STATS current_score = LAST(risk_score, @timestamp), boundary_score = FIRST(risk_score, @timestamp), docs = COUNT(*) BY entity_euid`,
          `| WHERE docs > 1 AND current_score IS NOT NULL AND boundary_score IS NOT NULL AND current_score - boundary_score >= 10`,
        ]
      : [
          `| EVAL period = CASE(@timestamp <= NOW() - ${window.boundary}, "boundary", "current")`,
          `| STATS score = LAST(risk_score, @timestamp) BY entity_euid, period`,
          `| EVAL current_score  = CASE(period == "current",  score, null)`,
          `| EVAL boundary_score = CASE(period == "boundary", score, null)`,
          `| STATS current_score = MAX(current_score), boundary_score = MAX(boundary_score) BY entity_euid`,
          `| WHERE current_score IS NOT NULL AND boundary_score IS NOT NULL AND current_score - boundary_score >= 10`,
        ]),
    `| RENAME entity_euid AS \`entity.id\``,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    `| WHERE entity.name IS NOT NULL`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    ...(sampleLimit !== undefined
      ? buildSampleTail(sampleLimit)
      : [
          includeIds
            ? `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`
            : `| STATS value = COUNT_DISTINCT(effective_id)`,
        ]),
  ].join('\n');
};
