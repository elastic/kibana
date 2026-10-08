/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from './time_range';
import {
  TRAILING_BUCKET_COLUMN,
  TRAILING_WINDOW,
  trailingFetchHours,
} from './tile_trailing_window';
import { trailingDotFilter } from './tile_trailing_dots';

/** Returns the result column of dot `k` (0 = newest) for the New entity tile. */
export const trailingNewEntityColumn = (k: number): string => `new_entities_${k}`;

/**
 * Builds one query that returns every sparkline dot of the New entity tile as columns of a single
 * row, where dot `k` is what the tile would have shown `k` steps ago: the entities first seen in
 * the selected time range ending `k` steps back.
 *
 * It uses the tile's own filter (`first_seen` in range and a risk score above 0), the same entity
 * filters and the same resolution dedupe. The risk score and the entity store are read as they are
 * now, so entities that were deleted since are missing from past dots.
 */
export const buildNewEntityTrailingSeriesQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '7d',
  entityFilterClauses: string[] = []
): string => {
  const { dots, stepHours } = TRAILING_WINDOW[timeRange];
  const aggregations = Array.from(
    { length: dots },
    (_, k) =>
      `${trailingNewEntityColumn(k)} = COUNT_DISTINCT(effective_id) ${trailingDotFilter(
        timeRange,
        k
      )}`
  );

  return [
    `FROM ${entitiesIndexName}`,
    `| WHERE entity.lifecycle.first_seen >= NOW() - ${trailingFetchHours(
      timeRange
    )}h AND entity.risk.calculated_score > 0`,
    ...entityFilterClauses,
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| EVAL ${TRAILING_BUCKET_COLUMN} = DATE_DIFF("hour", entity.lifecycle.first_seen, NOW()) / ${stepHours}`,
    `| STATS`,
    `    ${aggregations.join(',\n    ')}`,
  ].join('\n');
};
