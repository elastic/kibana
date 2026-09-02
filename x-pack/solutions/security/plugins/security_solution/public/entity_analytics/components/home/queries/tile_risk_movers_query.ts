/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds an ES|QL query that counts entities whose risk score rose by ≥10 points
 * vs the previous 24h window, using the risk score time-series history index.
 *
 * The query splits 48h of history into "today" (last 24h) and "yday" (24–48h ago)
 * buckets, takes the max score per entity per bucket, and filters to movers.
 *
 * Unlike LOOKUP JOIN tiles, no euidApi is needed — entity.id is a native field
 * on the risk score index and matches entity-latest directly.
 */
export const buildRiskMoversCountQuery = (spaceId: string): string => {
  const index = `risk-score.risk-score-${spaceId}`;
  return [
    `FROM ${index}`,
    `| WHERE @timestamp >= NOW() - 48h`,
    `| EVAL bucket = CASE(@timestamp >= NOW() - 24h, "today", "yday")`,
    `| STATS today_score = MAX(CASE(bucket == "today", entity.risk.calculated_score, null)), yday_score = MAX(CASE(bucket == "yday", entity.risk.calculated_score, null)) BY entity.id, entity.type`,
    `| WHERE today_score IS NOT NULL AND yday_score IS NOT NULL AND today_score - yday_score >= 10`,
    `| STATS value = COUNT(*), entity_ids = VALUES(entity.id)`,
  ].join('\n');
};
