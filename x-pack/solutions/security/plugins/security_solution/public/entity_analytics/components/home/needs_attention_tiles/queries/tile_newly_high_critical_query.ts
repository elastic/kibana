/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../use_time_range_param';
import type { ComparisonWindow } from './tile_time_window';

/**
 * Builds an ES|QL query that counts entities that crossed into High or Critical
 * risk since the N-period boundary, using the risk score time-series history index.
 *
 * Levels are mapped to integers (Critical=4, High=3, Moderate=2, Low=1, Unknown=0)
 * because MAX on the raw keyword sorts lexicographically (Unknown > Moderate > Low > High > Critical).
 *
 * Uses the same two-step LAST() pattern as tile_risk_movers_query.ts:
 * - Step 1: LAST(level_num, @timestamp) BY entity_name, period — actual level at each boundary
 * - Step 2: MAX to pivot boundary/current rows into two columns per entity
 *
 * LAST() avoids the false-exclusion bug in MAX: if an entity briefly peaked at Critical
 * during the boundary period then dropped to Low, MAX would record Critical and wrongly
 * exclude it from "newly H/C" today. LAST records the actual level at the final scoring run.
 *
 * An entity qualifies when:
 *   - current_level_num >= 3  (is High or Critical right now)
 *   - boundary_level_num < 3 OR boundary_level_num IS NULL  (was not H/C at the boundary)
 *
 * Use `newlyHighCriticalWindow(timeRange)` for the current period and
 * `newlyHighCriticalPrevWindow(timeRange)` for the previous period, then pass the result
 * to `buildNewlyHighCriticalCountQuery`.
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

/** Returns the time window for the current period of the newly high/critical query. */
export const newlyHighCriticalWindow = (timeRange: TimeRange = '24h'): ComparisonWindow => {
  const { fetchWindow, period } = TIME_RANGE_TO_ESQL[timeRange];
  return { fetchWindow, boundary: period };
};

/** Returns the time window for the previous period of the newly high/critical query. */
export const newlyHighCriticalPrevWindow = (timeRange: TimeRange = '24h'): ComparisonWindow => {
  const { prevFetchWindow, prevBoundary, upperBound } = PREV_TIME_RANGE_TO_ESQL[timeRange];
  return { fetchWindow: prevFetchWindow, boundary: prevBoundary, upperBound };
};

export const buildNewlyHighCriticalCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  window: ComparisonWindow = newlyHighCriticalWindow(),
  entityFilterClauses: string[] = []
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
    `| EVAL risk_level = COALESCE(host.risk.calculated_level, user.risk.calculated_level, service.risk.calculated_level)`,
    `| WHERE entity_euid IS NOT NULL`,
    `| EVAL level_num = CASE(risk_level == "Critical", 4, risk_level == "High", 3, risk_level == "Moderate", 2, risk_level == "Low", 1, 0)`,
    `| EVAL period = CASE(@timestamp <= NOW() - ${window.boundary}, "boundary", "current")`,
    `| STATS level_num = LAST(level_num, @timestamp) BY entity_euid, period`,
    `| EVAL current_level_num  = CASE(period == "current",  level_num, null)`,
    `| EVAL boundary_level_num = CASE(period == "boundary", level_num, null)`,
    `| STATS current_level_num  = MAX(current_level_num),`,
    `        boundary_level_num = MAX(boundary_level_num)`,
    `        BY entity_euid`,
    `| WHERE current_level_num >= 3 AND (boundary_level_num IS NULL OR boundary_level_num < 3)`,
    `| RENAME entity_euid AS \`entity.id\``,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    `| WHERE entity.name IS NOT NULL`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
  ].join('\n');
};
