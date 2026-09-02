/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds an ES|QL query that counts entities that crossed into High or Critical
 * risk since yesterday, using the risk score time-series history index.
 *
 * Uses numeric level mapping (Critical=4, High=3, Medium=2, Low=1, Unknown=0) so
 * that MAX() aggregation sorts correctly — MAX on the raw keyword field sorts
 * lexicographically (Unknown > Medium > Low > High > Critical), which is wrong.
 *
 * An entity qualifies when:
 *   - today_level_num >= 3  (today is High or Critical)
 *   - yday_level_num < 3 OR yday_level_num IS NULL  (was not H/C yesterday,
 *     or has no yesterday bucket — e.g. a newly tracked entity)
 */
export const buildNewlyHighCriticalCountQuery = (spaceId: string): string => {
  const index = `risk-score.risk-score-${spaceId}`;
  return [
    `FROM ${index}`,
    `| WHERE @timestamp >= NOW() - 48h`,
    `| EVAL bucket = CASE(@timestamp >= NOW() - 24h, "today", "yday")`,
    `| EVAL level_num = CASE(entity.risk.calculated_level == "Critical", 4, entity.risk.calculated_level == "High", 3, entity.risk.calculated_level == "Medium", 2, entity.risk.calculated_level == "Low", 1, 0)`,
    `| STATS today_level_num = MAX(CASE(bucket == "today", level_num, null)), yday_level_num = MAX(CASE(bucket == "yday", level_num, null)) BY entity.id, entity.type`,
    `| WHERE today_level_num >= 3 AND (yday_level_num IS NULL OR yday_level_num < 3)`,
    `| STATS value = COUNT(*), entity_ids = VALUES(entity.id)`,
  ].join('\n');
};
