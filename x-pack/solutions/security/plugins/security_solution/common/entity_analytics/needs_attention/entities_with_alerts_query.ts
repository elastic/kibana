/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/common/euid_helpers';
import type { TimeRange } from './time_range';
import type { SimpleTimeWindow } from './tile_time_window';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';
import { buildSampleTail, type TileCountQueryOptions } from './query_options';

export const alertsIndex = (spaceId: string) => `.alerts-security.alerts-${spaceId}`;

const DOUBLE_TIME_RANGE: Record<TimeRange, string> = {
  '24h': '48h',
  '7d': '14d',
  '30d': '60d',
};

/** Returns the time window for the current period of the alert-based tiles query. */
export const alertsWindow = (timeRange: TimeRange = '24h'): SimpleTimeWindow => ({
  from: timeRange,
});

/** Returns the time window for the previous period of the alert-based tiles query. */
export const alertsPrevWindow = (timeRange: TimeRange = '24h'): SimpleTimeWindow => ({
  from: DOUBLE_TIME_RANGE[timeRange],
  to: timeRange,
});

/**
 * Builds a single ES|QL query that computes both the entities-with-alerts count
 * and the watchlisted-entities-with-alerts count in one pass over the alerts index.
 *
 * This avoids running the EUID pipeline twice (once per tile). Both tile 1 and tile 5
 * consume their respective columns from the single STATS result.
 *
 * Performance: a STATS BY entity.id deduplication step runs before the LOOKUP JOIN,
 * reducing join cardinality from O(alerts) to O(distinct entities). The @timestamp
 * rename dance is not needed because @timestamp is dropped by the deduplication STATS.
 *
 * Watchlist filtering uses entity.attributes.watchlists IS NOT NULL evaluated after
 * the LOOKUP JOIN, replacing the old entity-latest last_seen approach. An entity
 * qualifies for the watchlist tile when it is watchlisted AND has an alert in the
 * selected time window (based on alert @timestamp, per Marios call 2025-09-18).
 *
 * COUNT_DISTINCT and VALUES ignore null values, so nulling out non-watchlisted rows
 * is all that is needed to produce the watchlist-only aggregation.
 *
 * Use `alertsWindow(timeRange)` for the current period and
 * `alertsPrevWindow(timeRange)` for the previous period, then pass the result
 * to this function.
 */
export const buildAlertBasedTilesQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string,
  spaceId: string,
  window: SimpleTimeWindow = alertsWindow(),
  entityFilterClauses: string[] = [],
  { includeIds = true, sampleLimit }: TileCountQueryOptions = {}
): string => {
  const parts: string[] = [];
  const upperBoundClause = window.to ? ` AND @timestamp < NOW() - ${window.to}` : '';

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${alertsIndex(spaceId)}`);
  parts.push(`| WHERE @timestamp >= NOW() - ${window.from}${upperBoundClause}`);
  parts.push(...buildAlertEuidPipeline(euid));

  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  // Discard entity IDs that have no entity-latest record (unrecognised identifiers).
  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );

  // Compute watchlist columns — null for non-watchlisted rows so COUNT_DISTINCT/VALUES ignore them.
  if (sampleLimit !== undefined) {
    parts.push(...buildSampleTail(sampleLimit));
    return parts.join('\n');
  }

  parts.push(`| EVAL is_watchlisted = entity.attributes.watchlists IS NOT NULL`);
  parts.push(`| EVAL watchlisted_effective_id = CASE(is_watchlisted, effective_id, null)`);
  parts.push(`| EVAL watchlisted_entity_id    = CASE(is_watchlisted, entity.id, null)`);

  parts.push(`| STATS`);
  parts.push(`    alerts_count           = COUNT_DISTINCT(effective_id),`);
  if (includeIds) {
    parts.push(`    alerts_entity_ids      = VALUES(effective_id),`);
  }
  parts.push(
    `    watchlisted_count      = COUNT_DISTINCT(watchlisted_effective_id)${includeIds ? ',' : ''}`
  );
  if (includeIds) {
    parts.push(`    watchlisted_entity_ids = VALUES(watchlisted_entity_id)`);
  }

  return parts.join('\n');
};
