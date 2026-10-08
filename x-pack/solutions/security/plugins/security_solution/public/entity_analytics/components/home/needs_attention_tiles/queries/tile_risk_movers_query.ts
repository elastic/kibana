/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../new_entities_table';
import { buildLookback, getRiskScoreIndex } from '../../new_entities_table/queries/esql';

/**
 * Builds an ES|QL query that counts entities whose risk score rose by ≥10 points
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
 * current score can qualify, and the entity branch reads only those, so both branches stay
 * small. A LOOKUP JOIN of every boundary entity cost about 0.1ms per row on a 10M-entity
 * store (3.5s for 30k entities); the merge takes about 0.5s with the same entities.
 *
 * Entity filters apply to the entity branch, so only entity docs in view take part.
 *
 * SET unmapped_fields="nullify" prevents errors when only some entity types are
 * present in the index (e.g. only host docs → user.name is not in the mapping).
 */

/** Width of the boundary window: covers at least one hourly scoring run. */
const BOUNDARY_WINDOW_HOURS = 2;

export const buildRiskMoversCountQuery = (
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
    // Boundary scores from the risk score docs.
    `  FROM ${index}`,
    `  | WHERE @timestamp >= ${boundary} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${boundary}`,
    `  | EVAL entity_euid = COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`,
    `  | EVAL risk_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
    `  | WHERE entity_euid IS NOT NULL`,
    `  | STATS boundary_score = LAST(risk_score, @timestamp) BY entity_euid`,
    `  | RENAME entity_euid AS \`entity.id\``,
    '), (',
    // Current scores from the entity docs in view: only scored entities can qualify.
    `  FROM ${entitiesIndexName}`,
    `  | WHERE entity.risk.calculated_score_norm IS NOT NULL AND entity.name IS NOT NULL`,
    ...entityFilterClauses.map((clause) => `  ${clause}`),
    `  | EVAL current_score = entity.risk.calculated_score_norm,`,
    `         effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `  | KEEP \`entity.id\`, current_score, effective_id`,
    ')',
    `| STATS boundary_score = MAX(boundary_score),`,
    `        current_score  = MAX(current_score),`,
    `        effective_id   = MAX(effective_id)`,
    `        BY \`entity.id\``,
    `| WHERE current_score - boundary_score >= 10`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(effective_id)`,
  ].join('\n');
};
