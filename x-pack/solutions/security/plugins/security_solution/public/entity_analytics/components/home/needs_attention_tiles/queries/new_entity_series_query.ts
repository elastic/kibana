/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildNewEntityTileHead } from './new_entity_query';
import {
  SERIES_BUCKET_COLUMN,
  buildSeriesBucketExpression,
  buildSeriesDotWindow,
  getSeriesWindow,
  seriesFetchHours,
} from './tile_series_window';

const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';

/** Returns the result column of dot `k` (0 = newest) of the New entity tile. */
export const newEntitySeriesColumn = (k: number): string => `new_entities_${k}`;

/**
 * Builds the query for the sparkline dots of the New entity tile, all as columns of one row. Dot
 * `k` is what the tile count would have shown `k` steps ago, so it follows the count: it starts
 * with the same stages (`buildNewEntityTileHead`) and the same rules. The risk score and the
 * entity store are read as they are now, so entities deleted since are missing from past dots.
 *
 * Like the count it counts resolved entities exactly: each one gets a column per dot holding its
 * earliest bucket inside that dot's window (null outside it), and a final `COUNT` of each column
 * gives the dot.
 */
export const buildNewEntitySeriesQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '7d',
  entityFilterClauses: string[] = []
): string => {
  const { dots } = getSeriesWindow(timeRange);
  const parts = buildNewEntityTileHead({
    entitiesIndexName,
    firstSeenCondition: `${FIRST_SEEN_FIELD} >= NOW() - ${seriesFetchHours(timeRange)}h`,
    entityFilterClauses,
    bucketExpression: buildSeriesBucketExpression(timeRange, FIRST_SEEN_FIELD),
  });

  const perEntity: string[] = [];
  const counts: string[] = [];
  for (let k = 0; k < dots; k++) {
    perEntity.push(
      `${newEntitySeriesColumn(k)} = MIN(${SERIES_BUCKET_COLUMN}) WHERE ${buildSeriesDotWindow(
        timeRange,
        k
      )}`
    );
    counts.push(`${newEntitySeriesColumn(k)} = COUNT(${newEntitySeriesColumn(k)})`);
  }

  parts.push(`| STATS`);
  parts.push(`    ${perEntity.join(',\n    ')}`);
  parts.push(`    BY effective_id`);
  parts.push(`| STATS`);
  parts.push(`    ${counts.join(',\n    ')}`);

  return parts.join('\n');
};
