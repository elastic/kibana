/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../use_time_range_param';

/**
 * Builds an ES|QL query that counts entities that crossed into High or Critical
 * risk since the N-period boundary, using the risk score time-series history index.
 *
 * Levels are mapped to integers (Critical=4, High=3, Moderate=2, Low=1, Unknown=0)
 * because MAX on the raw keyword sorts lexicographically (Unknown > Medium > Low > High > Critical).
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
 */

const TIME_RANGE_TO_ESQL: Record<TimeRange, { fetchWindow: string; period: string }> = {
  '24h': { fetchWindow: '26h', period: '24h' },
  '7d': { fetchWindow: '7d2h', period: '7d' },
  '30d': { fetchWindow: '30d2h', period: '30d' },
};

export const buildNewlyHighCriticalCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const index = `risk-score.risk-score-${spaceId}`;
  const { fetchWindow, period } = TIME_RANGE_TO_ESQL[timeRange];
  return [
    `SET unmapped_fields="nullify";`,
    `FROM ${index}`,
    `| WHERE @timestamp >= NOW() - ${fetchWindow}`,
    `| EVAL entity_name = COALESCE(host.name, user.name, service.name)`,
    `| EVAL risk_level = COALESCE(host.risk.calculated_level, user.risk.calculated_level, service.risk.calculated_level)`,
    `| WHERE entity_name IS NOT NULL`,
    `| EVAL level_num = CASE(risk_level == "Critical", 4, risk_level == "High", 3, risk_level == "Moderate", 2, risk_level == "Low", 1, 0)`,
    `| EVAL period = CASE(@timestamp <= NOW() - ${period}, "boundary", "current")`,
    `| STATS level_num = LAST(level_num, @timestamp) BY entity_name, period`,
    `| EVAL current_level_num  = CASE(period == "current",  level_num, null)`,
    `| EVAL boundary_level_num = CASE(period == "boundary", level_num, null)`,
    `| STATS current_level_num  = MAX(current_level_num),`,
    `        boundary_level_num = MAX(boundary_level_num)`,
    `        BY entity_name`,
    `| WHERE current_level_num >= 3 AND (boundary_level_num IS NULL OR boundary_level_num < 3)`,
    `| EVAL entity.id = entity_name`,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
  ].join('\n');
};
