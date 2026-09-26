/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../use_time_range_param';

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
 */

const TIME_RANGE_TO_ESQL: Record<TimeRange, { fetchWindow: string; period: string }> = {
  '24h': { fetchWindow: '26h', period: '24h' },
  '7d': { fetchWindow: '7d2h', period: '7d' },
  '30d': { fetchWindow: '30d2h', period: '30d' },
};

export const buildRiskMoversCountQuery = (
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
    `| EVAL risk_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
    `| WHERE entity_name IS NOT NULL`,
    `| EVAL period = CASE(@timestamp <= NOW() - ${period}, "boundary", "current")`,
    `| STATS score = LAST(risk_score, @timestamp) BY entity_name, period`,
    `| EVAL current_score  = CASE(period == "current",  score, null)`,
    `| EVAL boundary_score = CASE(period == "boundary", score, null)`,
    `| STATS current_score = MAX(current_score), boundary_score = MAX(boundary_score) BY entity_name`,
    `| WHERE current_score IS NOT NULL AND boundary_score IS NOT NULL AND current_score - boundary_score >= 10`,
    `| EVAL entity.id = entity_name`,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
  ].join('\n');
};
