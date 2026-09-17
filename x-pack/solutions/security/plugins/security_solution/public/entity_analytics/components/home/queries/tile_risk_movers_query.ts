/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../use_time_range_param';

/**
 * Builds an ES|QL query that counts entities whose risk score rose by ≥10 points
 * vs the previous period of the same length, using the risk score time-series history index.
 *
 * The risk score index uses type-specific field names (host.risk.calculated_score,
 * user.risk.calculated_score, service.risk.calculated_score) rather than a shared
 * entity.* namespace. We COALESCE across all three types so a single query covers
 * all entity types. entity_name maps to entity.name on entity-latest.
 *
 * SET unmapped_fields="nullify" prevents errors when only some entity types are
 * present in the index (e.g. only host docs → user.name is not in the mapping).
 */

const TIME_RANGE_TO_ESQL: Record<TimeRange, { window: string; period: string }> = {
  '24h': { window: '48h', period: '24h' },
  '7d': { window: '14d', period: '7d' },
  '30d': { window: '60d', period: '30d' },
};

export const buildRiskMoversCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const index = `risk-score.risk-score-${spaceId}`;
  const { window, period } = TIME_RANGE_TO_ESQL[timeRange];
  return [
    `SET unmapped_fields="nullify";`,
    `FROM ${index}`,
    `| WHERE @timestamp >= NOW() - ${window}`,
    `| EVAL entity_name = COALESCE(host.name, user.name, service.name)`,
    `| EVAL risk_score = COALESCE(host.risk.calculated_score, user.risk.calculated_score, service.risk.calculated_score)`,
    `| WHERE entity_name IS NOT NULL`,
    `| EVAL bucket = CASE(@timestamp >= NOW() - ${period}, "today", "yday")`,
    `| STATS today_score = MAX(CASE(bucket == "today", risk_score, null)), yday_score = MAX(CASE(bucket == "yday", risk_score, null)) BY entity_name`,
    `| WHERE today_score IS NOT NULL AND yday_score IS NOT NULL AND today_score - yday_score >= 10`,
    `| EVAL entity.id = entity_name`,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
  ].join('\n');
};
