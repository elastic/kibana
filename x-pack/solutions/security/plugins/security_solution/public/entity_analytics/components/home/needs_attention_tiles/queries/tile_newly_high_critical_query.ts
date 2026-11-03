/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildLookback, getRiskScoreIndex } from '../../entities_grid/queries/esql';
import { buildRiskLevelHistoryBranch } from './risk_history';
import { buildPreviousNewlyHighCriticalQuery } from './risk_previous_period';
import type { TilePeriod } from './tile_period';

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
 *
 * `period` 'previous' builds the same tile for the range right before the selected one, for the
 * period-over-period delta (see risk_previous_period.ts); the default 'current' is unchanged.
 */

export const buildNewlyHighCriticalCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = [],
  period: TilePeriod = 'current'
): string => {
  if (period === 'previous') {
    return buildPreviousNewlyHighCriticalQuery(
      spaceId,
      entitiesIndexName,
      timeRange,
      entityFilterClauses
    );
  }
  const index = getRiskScoreIndex(spaceId);
  const boundary = buildLookback(timeRange);
  return [
    `SET unmapped_fields="nullify";`,
    'FROM (',
    // Boundary levels from the risk score docs.
    ...buildRiskLevelHistoryBranch(index, boundary, 'boundary_level_num'),
    '), (',
    // Current levels from the entity docs: only High and Critical can qualify.
    `  FROM ${entitiesIndexName}`,
    // Aliases are left out: the group is judged by its main entity, which holds the group's level.
    `  | WHERE \`entity.relationships.resolution.resolved_to\` IS NULL`,
    `    AND (entity.risk.calculated_level IN ("High", "Critical") OR \`entity.relationships.resolution.risk.calculated_level\` IN ("High", "Critical"))`,
    // The group's level if the entity has one, else its own.
    `  | EVAL current_level = COALESCE(\`entity.relationships.resolution.risk.calculated_level\`, entity.risk.calculated_level)`,
    `  | WHERE current_level IN ("High", "Critical")`,
    `  | EVAL current_level_num = CASE(current_level == "Critical", 4, 3)`,
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
    // One row per resolved entity, because several ids can resolve to the same one. A plain COUNT of
    // those rows is exact; COUNT_DISTINCT would only estimate, and is approximate above about 3,000.
    `| STATS BY effective_id`,
    `| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)`,
  ].join('\n');
};
