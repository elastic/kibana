/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildLookback, getRiskScoreIndex } from '../../entities_grid/queries/esql';
import {
  BOUNDARY_WINDOW_HOURS,
  buildRiskLevelHistoryBranch,
  buildRiskScoreHistoryBranch,
} from './risk_history';
import { TIME_RANGE_DAYS } from './tile_period';

/*
 * The risk tiles compare an entity's risk now with its risk at the start of the period. The entity
 * doc only has the current value, so for the previous period both ends come from the risk score
 * history: the value at the end of the previous period (`NOW() - range`) and at its start
 * (`NOW() - 2 x range`). Like the current-period queries this merges the two history branches by
 * `entity.id` instead of joining every entity, then joins only the entities that qualify, for their
 * name, the entity filters and alias resolution.
 */

/** Returns where the previous period starts: `NOW() - 2 x range`. */
const buildPreviousPeriodStart = (timeRange: TimeRange): string =>
  `NOW() - ${2 * TIME_RANGE_DAYS[timeRange]} days`;

const buildJoinTail = (entitiesIndexName: string, entityFilterClauses: string[]): string[] => [
  `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
  `| WHERE entity.name IS NOT NULL`,
  ...entityFilterClauses,
  `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
  `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(effective_id)`,
];

/** Builds the Risk movers query for the previous period: score up by 10 or more over that period. */
export const buildPreviousRiskMoversQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange,
  entityFilterClauses: string[]
): string => {
  const index = getRiskScoreIndex(spaceId);
  return [
    `SET unmapped_fields="nullify";`,
    'FROM (',
    ...buildRiskScoreHistoryBranch(index, buildPreviousPeriodStart(timeRange), 'boundary_score'),
    '), (',
    ...buildRiskScoreHistoryBranch(index, buildLookback(timeRange), 'current_score'),
    ')',
    `| STATS boundary_score = MAX(boundary_score),`,
    `        current_score  = MAX(current_score)`,
    `        BY \`entity.id\``,
    `| WHERE current_score - boundary_score >= 10`,
    ...buildJoinTail(entitiesIndexName, entityFilterClauses),
  ].join('\n');
};

/** Builds the Newly high/critical query for the previous period: up into High or Critical over it. */
export const buildPreviousNewlyHighCriticalQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange,
  entityFilterClauses: string[]
): string => {
  const index = getRiskScoreIndex(spaceId);
  return [
    `SET unmapped_fields="nullify";`,
    'FROM (',
    ...buildRiskLevelHistoryBranch(
      index,
      buildPreviousPeriodStart(timeRange),
      'boundary_level_num'
    ),
    '), (',
    ...buildRiskLevelHistoryBranch(index, buildLookback(timeRange), 'current_level_num'),
    // Only High and Critical can qualify, so the end-of-period branch keeps just those.
    `  | WHERE current_level_num >= 3`,
    ')',
    `| STATS boundary_level_num = MAX(boundary_level_num),`,
    `        current_level_num  = MAX(current_level_num)`,
    `        BY \`entity.id\``,
    `| WHERE current_level_num >= 3 AND (boundary_level_num IS NULL OR current_level_num > boundary_level_num)`,
    ...buildJoinTail(entitiesIndexName, entityFilterClauses),
  ].join('\n');
};

/**
 * Builds a query that counts the risk score docs around the start of the previous period. When it
 * returns 0 the history does not reach back that far, and the previous period cannot be compared.
 */
export const buildRiskHistoryExistsQuery = (spaceId: string, timeRange: TimeRange): string => {
  const start = buildPreviousPeriodStart(timeRange);
  return [
    `FROM ${getRiskScoreIndex(spaceId)}`,
    `| WHERE @timestamp >= ${start} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${start}`,
    `| STATS boundary_docs = COUNT(*)`,
  ].join('\n');
};
