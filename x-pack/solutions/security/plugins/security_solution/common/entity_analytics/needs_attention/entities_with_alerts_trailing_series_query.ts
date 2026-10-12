/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/common/euid_helpers';
import type { TimeRange } from './time_range';
import { alertsIndex } from './entities_with_alerts_query';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';
import {
  TRAILING_BUCKET_COLUMN,
  TRAILING_WINDOW,
  trailingBucketGrouping,
  trailingFetchHours,
} from './tile_trailing_window';

/** Returns the result column of dot `k` (0 = newest) for the Entities with alerts tile. */
export const trailingAlertsColumn = (k: number): string => `alerts_${k}`;

/** Returns the result column of dot `k` (0 = newest) for the Watchlisted tile. */
export const trailingWatchlistedColumn = (k: number): string => `watchlisted_${k}`;

/**
 * Builds one query that returns every sparkline dot of the Entities with alerts and Watchlisted
 * tiles as columns of a single row, where dot `k` is what the tile would have shown `k` steps ago.
 *
 * Alerts are deduplicated per (bucket, entity) before the LOOKUP JOIN, then each dot counts the
 * distinct entities in the buckets of its trailing window (the selected time range).
 */
export const buildAlertBasedTilesTrailingSeriesQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string,
  spaceId: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const { dots } = TRAILING_WINDOW[timeRange];
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${alertsIndex(spaceId)}`);
  parts.push(`| WHERE @timestamp >= NOW() - ${trailingFetchHours(timeRange)}h`);
  parts.push(...buildAlertEuidPipeline(euid, trailingBucketGrouping(timeRange)));

  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );
  parts.push(
    `| EVAL watchlisted_effective_id = CASE(entity.attributes.watchlists IS NOT NULL, effective_id, null)`
  );

  const dotWindow = (k: number) =>
    `WHERE ${TRAILING_BUCKET_COLUMN} >= ${k} AND ${TRAILING_BUCKET_COLUMN} <= ${k + dots - 1}`;
  const aggregations = Array.from({ length: dots }, (_, k) => [
    `${trailingAlertsColumn(k)} = COUNT_DISTINCT(effective_id) ${dotWindow(k)}`,
    `${trailingWatchlistedColumn(k)} = COUNT_DISTINCT(watchlisted_effective_id) ${dotWindow(k)}`,
  ]).flat();
  parts.push(`| STATS`);
  parts.push(`    ${aggregations.join(',\n    ')}`);

  return parts.join('\n');
};
