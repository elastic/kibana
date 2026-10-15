/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildAnomalyTileHead } from './entities_with_anomalies_query';
import {
  SERIES_BUCKET_COLUMN,
  buildSeriesBucketExpression,
  buildSeriesDotWindow,
  getSeriesWindow,
  seriesFetchHours,
} from './tile_series_window';

/** Returns the result column of dot `k` (0 = newest) of the Entities with anomalies tile. */
export const anomaliesSeriesColumn = (k: number): string => `anomalies_${k}`;

/**
 * Builds the query for the sparkline dots of the Entities with anomalies tile, all as columns of
 * one row. Dot `k` is what the tile count would have shown `k` steps ago, so it follows the count:
 * it starts with the same stages (`buildAnomalyTileHead`) and the same rules (record filter and
 * installed jobs).
 *
 * Like the count it counts resolved entities exactly: each one gets a column per dot holding its
 * earliest bucket inside that dot's window (null outside it), and a final `COUNT` of each column
 * gives the dot.
 */
export const buildEntitiesWithAnomaliesSeriesQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = [],
  jobIds: string[] = []
): string => {
  const { dots } = getSeriesWindow(timeRange);
  const parts = buildAnomalyTileHead({
    entitiesIndexName,
    windowCondition: `@timestamp >= NOW() - ${seriesFetchHours(timeRange)}h`,
    entityFilterClauses,
    jobIds,
    bucketExpression: buildSeriesBucketExpression(timeRange),
  });

  const perEntity: string[] = [];
  const counts: string[] = [];
  for (let k = 0; k < dots; k++) {
    perEntity.push(
      `${anomaliesSeriesColumn(k)} = MIN(${SERIES_BUCKET_COLUMN}) WHERE ${buildSeriesDotWindow(
        timeRange,
        k
      )}`
    );
    counts.push(`${anomaliesSeriesColumn(k)} = COUNT(${anomaliesSeriesColumn(k)})`);
  }

  parts.push(`| STATS`);
  parts.push(`    ${perEntity.join(',\n    ')}`);
  parts.push(`    BY effective_id`);
  parts.push(`| STATS`);
  parts.push(`    ${counts.join(',\n    ')}`);

  return parts.join('\n');
};
