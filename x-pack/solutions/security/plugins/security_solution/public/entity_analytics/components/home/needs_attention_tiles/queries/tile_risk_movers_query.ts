/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildLookback, getRiskScoreIndex } from '../../entities_grid/queries/esql';
import { RISK_MOVER_MIN_SCORE_CHANGE, buildRiskScoreHistoryBranch } from './risk_history';
import { buildPreviousRiskMoversQuery } from './risk_previous_period';
import type { TilePeriod } from './tile_period';

/**
 * Builds an ES|QL query that counts entities whose risk score rose by at least `RISK_MOVER_MIN_SCORE_CHANGE` points
 * since the start of the period: current score minus the score at the period boundary.
 *
 * Only two points in time matter, so the query reads only what it needs:
 * - Boundary score: the last score in the two hours before the boundary
 *   (`[NOW() - period - 2h, NOW() - period]`). Scoring runs hourly, so the window always
 *   holds at least one run. LAST() takes the actual snapshot, not the highest score seen.
 * - Current score: `entity.risk.calculated_score_norm` on the entity doc, which the risk
 *   score maintainer writes in the same step as the risk score docs. It is also the score
 *   the entities table shows, so the tile and its rows agree.
 *
 * The two branches are merged by `entity.id` instead of a LOOKUP JOIN. Only entities with a
 * current score of at least the minimum rise can qualify (scores are never negative), and the
 * entity branch reads only those, so both branches stay small: an entity reset to a score of 0
 * after it stopped alerting is not read. A LOOKUP JOIN of every boundary entity cost about 0.1ms per row on a 10M-entity
 * store (3.1–3.7s for 30k entities); the merge takes 0.4–0.6s with the same entities, and
 * counts the same (16GB ECH, Oct 2026).
 *
 * Entity filters apply to the entity branch, so only entity docs in view take part.
 *
 * SET unmapped_fields="nullify" prevents errors when only some entity types are
 * present in the index (e.g. only host docs → user.name is not in the mapping).
 *
 * `period` 'previous' builds the same tile for the range right before the selected one, for the
 * period-over-period delta (see risk_previous_period.ts); the default 'current' is unchanged.
 */

export const buildRiskMoversCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = [],
  period: TilePeriod = 'current'
): string => {
  if (period === 'previous') {
    return buildPreviousRiskMoversQuery(spaceId, entitiesIndexName, timeRange, entityFilterClauses);
  }
  const index = getRiskScoreIndex(spaceId);
  const boundary = buildLookback(timeRange);
  return [
    `SET unmapped_fields="nullify";`,
    'FROM (',
    // Boundary scores from the risk score docs.
    ...buildRiskScoreHistoryBranch(index, boundary, 'boundary_score'),
    '), (',
    // Current scores from the entity docs in view. A mover rose by at least `RISK_MOVER_MIN_SCORE_CHANGE` and a
    // score is never negative, so an entity whose current score is below that cannot count: it is
    // not read. This keeps the read from growing with every entity that was ever scored (an entity
    // that stops alerting is reset to a score of 0, which is not null, and stays in the store).
    `  FROM ${entitiesIndexName}`,
    // Aliases are left out: the group is judged by its main entity, which holds the group's score.
    `  | WHERE \`entity.relationships.resolution.resolved_to\` IS NULL AND entity.name IS NOT NULL`,
    `    AND COALESCE(\`entity.relationships.resolution.risk.calculated_score_norm\`, entity.risk.calculated_score_norm) >= ${RISK_MOVER_MIN_SCORE_CHANGE}`,
    ...entityFilterClauses.map((clause) => `  ${clause}`),
    // The group's score if the entity has one, else its own.
    `  | EVAL current_score = COALESCE(\`entity.relationships.resolution.risk.calculated_score_norm\`, entity.risk.calculated_score_norm),`,
    `         effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `  | KEEP \`entity.id\`, current_score, effective_id`,
    ')',
    `| STATS boundary_score = MAX(boundary_score),`,
    `        current_score  = MAX(current_score),`,
    `        effective_id   = MAX(effective_id)`,
    `        BY \`entity.id\``,
    `| WHERE current_score - boundary_score >= ${RISK_MOVER_MIN_SCORE_CHANGE}`,
    // One row per resolved entity, because several ids can resolve to the same one. A plain COUNT of
    // those rows is exact; COUNT_DISTINCT would only estimate, and is approximate above about 3,000.
    `| STATS BY effective_id`,
    `| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)`,
  ].join('\n');
};
