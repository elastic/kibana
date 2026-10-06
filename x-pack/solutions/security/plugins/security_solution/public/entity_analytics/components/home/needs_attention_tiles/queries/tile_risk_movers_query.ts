/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../new_entities_table';

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
 * Reading every risk doc in the period to find the latest one took 34s at 30d on 10M
 * entities; this reads two hours of docs (about 3.6s, same entities).
 *
 * The boundary entities are joined to their entity docs, so the cost grows with the number
 * of entities scored at the boundary, not with the length of the period.
 *
 * SET unmapped_fields="nullify" prevents errors when only some entity types are
 * present in the index (e.g. only host docs → user.name is not in the mapping).
 */

/** ES|QL duration of each time range; the boundary is this long before now. */
const PERIOD: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

/** Width of the boundary window: covers at least one hourly scoring run. */
const BOUNDARY_WINDOW_HOURS = 2;

export const buildRiskMoversCountQuery = (
  spaceId: string,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const index = `risk-score.risk-score-${spaceId}`;
  const boundary = `NOW() - ${PERIOD[timeRange]}`;
  return [
    `SET unmapped_fields="nullify";`,
    `FROM ${index}`,
    `| WHERE @timestamp >= ${boundary} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${boundary}`,
    `| EVAL entity_euid = COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`,
    `| EVAL risk_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
    `| WHERE entity_euid IS NOT NULL`,
    `| STATS boundary_score = LAST(risk_score, @timestamp) BY entity_euid`,
    `| RENAME entity_euid AS \`entity.id\``,
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    // Drops risk docs whose entity has no entity doc.
    `| WHERE entity.name IS NOT NULL`,
    // The current score comes from the entity doc (see above).
    `| WHERE entity.risk.calculated_score_norm - boundary_score >= 10`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(effective_id)`,
  ].join('\n');
};
