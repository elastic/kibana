/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { GROUP_ON_WATCHLIST, buildAlertTilesHead } from './entities_with_alerts_query';
import { buildGroupFilterSteps } from './group_filter_steps';
import {
  SERIES_BUCKET_COLUMN,
  buildSeriesBucketExpression,
  buildSeriesDotWindow,
  getSeriesWindow,
  seriesFetchHours,
} from './tile_series_window';

/** Returns the result column of dot `k` (0 = newest) of the Entities with alerts tile. */
export const severeAlertsSeriesColumn = (k: number): string => `severe_alerts_${k}`;

/** Returns the result column of dot `k` (0 = newest) of the Watchlisted tile. */
/** The helper column of dot `k`: the earliest bucket in its window with an alert of any severity. */
const alertedColumn = (k: number): string => `alerted_${k}`;

export const watchlistedSeriesColumn = (k: number): string => `watchlisted_${k}`;

/**
 * Builds the query for the sparkline dots of the Entities with alerts and Watchlisted tiles, all
 * as columns of one row. Dot `k` is what the tile count would have shown `k` steps ago, so it
 * follows the count: it starts with the same stages (`buildAlertTilesHead`) and the same rules
 * (high or critical alerts for Entities with alerts, any alert for Watchlisted).
 *
 * The count's rows are one per entity, so counting them is exact. A dot covers many buckets, so
 * each entity gets one column per dot holding its earliest bucket inside that dot's window (null
 * outside it), and a final `COUNT` of each column gives the dot. `COUNT_DISTINCT` would only
 * estimate, and the estimate drifts by percents above a few thousand entities.
 */
export const buildAlertBasedTilesSeriesQuery = (
  entitiesIndexName: string,
  spaceId: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const { dots } = getSeriesWindow(timeRange);
  const parts = buildAlertTilesHead({
    entitiesIndexName,
    spaceId,
    windowCondition: `@timestamp >= NOW() - ${seriesFetchHours(timeRange)}h`,
    bucketExpression: buildSeriesBucketExpression(timeRange),
  });

  // One row per resolved group: for each dot, the earliest bucket inside its window in which the
  // group had an alert (`any`) or a severe alert; plus whether any of its members is watchlisted.
  const perGroup: string[] = [];
  const counts: string[] = [];
  for (let k = 0; k < dots; k++) {
    const dotWindow = buildSeriesDotWindow(timeRange, k);
    perGroup.push(
      `${severeAlertsSeriesColumn(
        k
      )} = MIN(${SERIES_BUCKET_COLUMN}) WHERE has_severe_alert AND ${dotWindow}`,
      `${alertedColumn(k)} = MIN(${SERIES_BUCKET_COLUMN}) WHERE ${dotWindow}`
    );
    counts.push(
      `${severeAlertsSeriesColumn(k)} = COUNT(${severeAlertsSeriesColumn(k)})`,
      `${watchlistedSeriesColumn(k)} = COUNT(CASE(${GROUP_ON_WATCHLIST}, ${alertedColumn(
        k
      )}, null))`
    );
  }

  parts.push(`| STATS`);
  parts.push(`    ${perGroup.join(',\n    ')},`);
  parts.push(`    group_on_watchlist = MAX(group_on_watchlist)`);
  parts.push(`    BY effective_id`);
  // The filters judge the group by its main entity, as the count does.
  parts.push(...buildGroupFilterSteps(entitiesIndexName, entityFilterClauses));
  parts.push(`| STATS`);
  parts.push(`    ${counts.join(',\n    ')}`);

  return parts.join('\n');
};
