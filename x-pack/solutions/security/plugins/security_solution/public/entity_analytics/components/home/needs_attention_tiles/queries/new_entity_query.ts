/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import type { TilePeriod } from './tile_period';

const TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const DOUBLE_TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '48 hours',
  '7d': '14 days',
  '30d': '60 days',
};

/** Keeps the entities first seen in the selected range, or in the range right before it. */
const firstSeenCondition = (timeRange: TimeRange, period: TilePeriod): string =>
  period === 'current'
    ? `entity.lifecycle.first_seen >= NOW() - ${TIME_RANGE_TO_ESQL[timeRange]}`
    : `entity.lifecycle.first_seen >= NOW() - ${DOUBLE_TIME_RANGE_TO_ESQL[timeRange]} AND entity.lifecycle.first_seen < NOW() - ${TIME_RANGE_TO_ESQL[timeRange]}`;

/**
 * Builds the ES|QL query behind the New entity tile: the entities first seen within the selected
 * range that have a risk score above 0, counted after resolution so aliases of one entity count once.
 * `period` 'previous' moves the first_seen window back by one range, for the period-over-period delta;
 * the default 'current' builds the query exactly as the tile always has.
 */
export const buildNewEntityCountQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '7d',
  entityFilterClauses: string[] = [],
  period: TilePeriod = 'current'
): string =>
  [
    `FROM ${entitiesIndexName}`,
    `| WHERE ${firstSeenCondition(timeRange, period)} AND entity.risk.calculated_score > 0`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
  ].join('\n');
