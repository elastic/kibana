/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from './time_range';
import { buildSampleTail, type TileCountQueryOptions } from './query_options';

const TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const DOUBLE_TIME_RANGE: Record<TimeRange, string> = {
  '24h': '48 hours',
  '7d': '14 days',
  '30d': '60 days',
};

/** Entities first seen within the window that currently have a non-zero risk score. */
export const buildNewEntityCountQuery = (
  index: string,
  timeRange: TimeRange,
  entityFilterClauses: string[] = [],
  { includeIds = true, sampleLimit }: TileCountQueryOptions = {}
): string =>
  [
    `FROM ${index}`,
    `| WHERE entity.lifecycle.first_seen >= NOW() - ${TIME_RANGE_TO_ESQL[timeRange]} AND entity.risk.calculated_score > 0`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    ...(sampleLimit !== undefined
      ? buildSampleTail(sampleLimit)
      : [
          includeIds
            ? `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`
            : `| STATS value = COUNT_DISTINCT(effective_id)`,
        ]),
  ].join('\n');

/** Same as `buildNewEntityCountQuery` for the period immediately before the window. */
export const buildNewEntityPrevCountQuery = (
  index: string,
  timeRange: TimeRange,
  entityFilterClauses: string[] = [],
  { includeIds = true }: TileCountQueryOptions = {}
): string =>
  [
    `FROM ${index}`,
    `| WHERE entity.lifecycle.first_seen >= NOW() - ${DOUBLE_TIME_RANGE[timeRange]} AND entity.lifecycle.first_seen < NOW() - ${TIME_RANGE_TO_ESQL[timeRange]} AND entity.risk.calculated_score > 0`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    includeIds
      ? `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`
      : `| STATS value = COUNT_DISTINCT(effective_id)`,
  ].join('\n');
