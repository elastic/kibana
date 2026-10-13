/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';

const TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

/**
 * Builds the ES|QL query behind the New entity tile: the entities first seen within the selected
 * range that have a risk score above 0, counted after resolution so aliases of one entity count once.
 */
export const buildNewEntityCountQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '7d',
  entityFilterClauses: string[] = []
): string =>
  [
    `FROM ${entitiesIndexName}`,
    `| WHERE entity.lifecycle.first_seen >= NOW() - ${TIME_RANGE_TO_ESQL[timeRange]} AND entity.risk.calculated_score > 0`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
  ].join('\n');
