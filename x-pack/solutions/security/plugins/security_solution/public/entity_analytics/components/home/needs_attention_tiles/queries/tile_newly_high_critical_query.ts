/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../new_entities_table/common';
import { buildLookback, getRiskScoreIndex } from '../../new_entities_table/queries/esql';

/**
 * Builds an ES|QL query that counts entities that crossed into High or Critical risk
 * since the period boundary.
 *
 * Levels are mapped to integers (Critical=4, High=3, Moderate=2, Low=1, Unknown=0)
 * because MAX on the raw keyword sorts lexicographically (Unknown > Moderate > Low > High > Critical).
 *
 * Only two points in time matter, so the query reads only what it needs:
 * - Boundary level: the last level in the two hours before the boundary
 *   (`[NOW() - period - 2h, NOW() - period]`). Scoring runs hourly, so the window always
 *   holds at least one run. LAST() takes the actual level at that run: MAX would record a
 *   brief Critical peak and wrongly exclude an entity that dropped back to Low.
 * - Current level: `entity.risk.calculated_level` on the entity doc, which the risk score
 *   maintainer writes in the same step as the risk score docs. It is also the level the
 *   entities table shows, so the tile and its rows agree.
 *
 * An entity with no level at the boundary can still qualify, so the boundary levels can't
 * drive the query alone. Two branches are merged by `entity.id`: the boundary levels, and
 * the entities that are High or Critical now. The second branch reads only High and Critical
 * entity docs, so the cost grows with their number, not with the length of the period.
 *
 * Reading every risk doc in the period took 46s at 30d on 10M entities; this takes about
 * 0.5s with the same entities (16GB ECH, Oct 2026).
 *
 * An entity qualifies when:
 *   - current_level_num >= 3  (is High or Critical right now)
 *   - boundary_level_num IS NULL OR current_level_num > boundary_level_num  (had no level at the
 *     boundary, or a lower one: Low or Moderate to High or Critical, or High to Critical)
 */

/** Width of the boundary window: covers at least one hourly scoring run. */
const BOUNDARY_WINDOW_HOURS = 2;

export const buildNewlyHighCriticalCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const index = getRiskScoreIndex(spaceId);
  const boundary = buildLookback(timeRange);
  return [
    `SET unmapped_fields="nullify";`,
    'FROM (',
    // Boundary levels from the risk score docs.
    `  FROM ${index}`,
    `  | WHERE @timestamp >= ${boundary} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${boundary}`,
    `  | EVAL entity_euid = COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`,
    `  | EVAL risk_level = COALESCE(host.risk.calculated_level, user.risk.calculated_level, service.risk.calculated_level)`,
    `  | WHERE entity_euid IS NOT NULL`,
    // Nested single-condition CASEs: ES|QL evaluates a multi-condition CASE one row at a time.
    `  | EVAL level_low = CASE(risk_level == "Low", 1, 0),`,
    `         level_moderate = CASE(risk_level == "Moderate", 2, level_low),`,
    `         level_high = CASE(risk_level == "High", 3, level_moderate),`,
    `         level_num = CASE(risk_level == "Critical", 4, level_high)`,
    `  | STATS boundary_level_num = LAST(level_num, @timestamp) BY entity_euid`,
    `  | RENAME entity_euid AS \`entity.id\``,
    '), (',
    // Current levels from the entity docs: only High and Critical can qualify.
    `  FROM ${entitiesIndexName}`,
    `  | WHERE entity.risk.calculated_level IN ("High", "Critical")`,
    `  | EVAL current_level_num = CASE(entity.risk.calculated_level == "Critical", 4, 3)`,
    `  | KEEP \`entity.id\`, current_level_num`,
    ')',
    `| STATS boundary_level_num = MAX(boundary_level_num),`,
    `        current_level_num  = MAX(current_level_num)`,
    `        BY \`entity.id\``,
    `| WHERE current_level_num >= 3 AND (boundary_level_num IS NULL OR current_level_num > boundary_level_num)`,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    `| WHERE entity.name IS NOT NULL`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(effective_id)`,
  ].join('\n');
};
