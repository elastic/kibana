/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { GROUP_FIRST_SEEN_COLUMN, buildNewEntityTileHead } from './new_entity_query';
import {
  SERIES_BUCKET_COLUMN,
  buildSeriesBucketExpression,
  buildSeriesDotWindow,
  getSeriesWindow,
  seriesFetchHours,
} from './tile_series_window';

/** Returns the result column of dot `k` (0 = newest) of the New entity tile. */
export const newEntitySeriesColumn = (k: number): string => `new_entities_${k}`;

/**
 * Builds the query for the sparkline dots of the New entity tile, all as columns of one row. Dot
 * `k` is what the tile count would have shown `k` steps ago, so it follows the count: it starts
 * with the same stages (`buildNewEntityTileHead`) and the same rules. The risk score and the
 * entity store are read as they are now, so entities deleted since are missing from past dots.
 *
 * Like the count it works on resolved groups, one row each, so each dot is an exact `COUNT` of the
 * groups whose earliest member was first seen inside that dot's window.
 */
export const buildNewEntitySeriesQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '7d',
  entityFilterClauses: string[] = []
): string => {
  const { dots } = getSeriesWindow(timeRange);
  const parts = buildNewEntityTileHead({
    entitiesIndexName,
    lowerBound: `NOW() - ${seriesFetchHours(timeRange)}h`,
    firstSeenWindow: (field) => `${field} >= NOW() - ${seriesFetchHours(timeRange)}h`,
    entityFilterClauses,
    bucketExpression: buildSeriesBucketExpression(timeRange, GROUP_FIRST_SEEN_COLUMN),
  });

  // One row per group, so each dot is an exact COUNT of the groups whose bucket is inside its window.
  const counts = Array.from(
    { length: dots },
    (_, k) =>
      `${newEntitySeriesColumn(k)} = COUNT(${SERIES_BUCKET_COLUMN}) WHERE ${buildSeriesDotWindow(
        timeRange,
        k
      )}`
  );

  parts.push(`| STATS`);
  parts.push(`    ${counts.join(',\n    ')}`);

  return parts.join('\n');
};
