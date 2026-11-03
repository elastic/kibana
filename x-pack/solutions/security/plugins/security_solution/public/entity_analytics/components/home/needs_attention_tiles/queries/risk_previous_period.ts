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
  RISK_MOVER_MIN_SCORE_CHANGE,
  buildRiskLevelHistoryBranch,
  buildRiskScoreHistoryBranch,
} from './risk_history';
import { buildPreviousPeriodStart } from './tile_period';

/*
 * The risk tiles compare an entity's risk now with its risk at the start of the period. The entity
 * doc only has the current value, so for the previous period both ends come from the risk score
 * history: the value at the end of the previous period (`NOW() - range`) and at its start
 * (`NOW() - 2 x range`). Like the current-period queries this merges the two history branches by
 * `entity.id` instead of joining every entity, then joins only the entities that qualify, for their
 * name, the entity filters and alias resolution.
 */

export const buildJoinTail = (
  entitiesIndexName: string,
  entityFilterClauses: string[]
): string[] => [
  `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
  // Aliases are left out: the group is judged by its main entity, whose history holds the group's score.
  `| WHERE entity.name IS NOT NULL AND \`entity.relationships.resolution.resolved_to\` IS NULL`,
  ...entityFilterClauses,
  `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
  // One row per resolved entity, then a plain COUNT: exact, unlike the approximate COUNT_DISTINCT.
  // The previous period only needs the count, not the entity ids.
  `| STATS BY effective_id`,
  `| STATS value = COUNT(effective_id)`,
];

/** Builds the Risk movers query for the previous period: score up by the minimum rise or more over that period. */
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
    `| WHERE current_score - boundary_score >= ${RISK_MOVER_MIN_SCORE_CHANGE}`,
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
 * Builds a query that tells whether the risk history reaches both ends of the previous period: it
 * has docs in the two hours before the start (`NOW() - 2 x range`) and before the end
 * (`NOW() - range`). It returns one boolean column, `reaches_back`. Without the start the previous
 * period cannot be compared; without the end (for example scoring was paused then) its count would
 * be 0 for lack of data, and the delta a false rise.
 */
export const buildRiskHistoryReachesBackQuery = (spaceId: string, timeRange: TimeRange): string => {
  const start = buildPreviousPeriodStart(timeRange);
  const end = buildLookback(timeRange);
  return [
    `FROM ${getRiskScoreIndex(spaceId)}`,
    `| WHERE (@timestamp >= ${start} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${start}) OR (@timestamp >= ${end} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${end})`,
    // The two windows do not overlap (the range is at least a day), so a doc is in one of them.
    `| EVAL in_start = @timestamp <= ${start}, in_end = @timestamp >= ${end} - ${BOUNDARY_WINDOW_HOURS} hours`,
    `| STATS has_start = MAX(in_start), has_end = MAX(in_end)`,
    `| EVAL reaches_back = COALESCE(has_start, false) AND COALESCE(has_end, false)`,
    `| KEEP reaches_back`,
  ].join('\n');
};
