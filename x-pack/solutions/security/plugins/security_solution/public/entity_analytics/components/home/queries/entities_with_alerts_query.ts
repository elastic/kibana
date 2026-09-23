/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import type { TimeRange } from '../use_time_range_param';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';

const alertsIndex = (spaceId: string) => `.alerts-security.alerts-${spaceId}`;

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
 */
export const buildAlertBasedTilesQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string,
  spaceId: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${alertsIndex(spaceId)}`);
  parts.push(`| WHERE @timestamp >= NOW() - ${timeRange}`);
  parts.push(...buildAlertEuidPipeline(euid));

  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  // Discard entity IDs that have no entity-latest record (unrecognised identifiers).
  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );

  // Compute watchlist columns — null for non-watchlisted rows so COUNT_DISTINCT/VALUES ignore them.
  parts.push(`| EVAL is_watchlisted = entity.attributes.watchlists IS NOT NULL`);
  parts.push(`| EVAL watchlisted_effective_id = CASE(is_watchlisted, effective_id, null)`);
  parts.push(`| EVAL watchlisted_entity_id    = CASE(is_watchlisted, entity.id, null)`);

  parts.push(`| STATS`);
  parts.push(`    alerts_count           = COUNT_DISTINCT(effective_id),`);
  parts.push(`    alerts_entity_ids      = VALUES(entity.id),`);
  parts.push(`    watchlisted_count      = COUNT_DISTINCT(watchlisted_effective_id),`);
  parts.push(`    watchlisted_entity_ids = VALUES(watchlisted_entity_id)`);

  return parts.join('\n');
};
