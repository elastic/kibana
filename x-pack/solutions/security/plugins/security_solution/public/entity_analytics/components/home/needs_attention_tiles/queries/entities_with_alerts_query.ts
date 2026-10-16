/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { getAlertsIndex } from '../../entities_grid/queries/esql';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';
import { buildPeriodCondition } from './tile_period';
import type { TilePeriod } from './tile_period';

/**
 * Builds a single ES|QL query that computes two tiles in one pass over the alerts index:
 * - severely alerting: entities with at least one high- or critical-severity alert,
 * - watchlisted & alerting: watchlisted entities with an alert of any severity.
 *
 * This avoids running the EUID pipeline once per tile. Each tile reads its own columns
 * from the single STATS result.
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
 * COUNT and VALUES ignore null values, so nulling out non-watchlisted rows
 * is all that is needed to produce the watchlist-only aggregation.
 *
 * `period` shifts the whole window back by one range ('previous'), for the period-over-period
 * delta. The previous period only needs the counts, so it leaves out the entity id lists.
 */
interface AlertTilesHeadOptions {
  entitiesIndexName: string;
  spaceId: string;
  /** The ES|QL condition that keeps the alerts of the window the query covers. */
  windowCondition: string;
  entityFilterClauses: string[];
  /** Passed to the alert pipeline to get one row per (bucket, entity) for the sparkline series. */
  bucketExpression?: string;
}

/**
 * The stages the alert based tile queries share, up to the resolved entity and its watchlist flag:
 * the alerts of the window, their entity ids, the join to the entities, the entity filters.
 * The count and the sparkline series both start here, so they cannot drift apart.
 */
export const buildAlertTilesHead = ({
  entitiesIndexName,
  spaceId,
  windowCondition,
  entityFilterClauses,
  bucketExpression,
}: AlertTilesHeadOptions): string[] => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${getAlertsIndex(spaceId)}`);
  parts.push(`| WHERE ${windowCondition}`);
  parts.push(...buildAlertEuidPipeline(bucketExpression));

  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  // Discard entity IDs that have no entity-latest record (unrecognised identifiers).
  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );
  parts.push(`| EVAL is_watchlisted = entity.attributes.watchlists IS NOT NULL`);

  return parts;
};

export const buildAlertBasedTilesQuery = (
  entitiesIndexName: string,
  spaceId: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = [],
  period: TilePeriod = 'current'
): string => {
  const parts = buildAlertTilesHead({
    entitiesIndexName,
    spaceId,
    windowCondition: buildPeriodCondition('@timestamp', timeRange, period),
    entityFilterClauses,
  });

  // One row per resolved entity: whether any of its alerting records has a severe alert or
  // is watchlisted.
  parts.push(
    `| STATS has_severe_alert = MAX(has_severe_alert), is_watchlisted = MAX(is_watchlisted) BY effective_id`
  );

  // Per-tile ids: null for entities outside the tile so COUNT/VALUES ignore them.
  parts.push(`| EVAL severe_id = CASE(has_severe_alert, effective_id, null)`);
  parts.push(`| EVAL watchlisted_id = CASE(is_watchlisted, effective_id, null)`);

  // Each row is one resolved entity (the STATS BY effective_id above), so counting the non-null ids
  // is exact. COUNT_DISTINCT would only estimate: it is approximate above about 3,000 values.
  parts.push(`| STATS`);
  if (period === 'previous') {
    parts.push(`    severe_alerts_count      = COUNT(severe_id),`);
    parts.push(`    watchlisted_count        = COUNT(watchlisted_id)`);
  } else {
    parts.push(`    severe_alerts_count      = COUNT(severe_id),`);
    parts.push(`    severe_alerts_entity_ids = VALUES(severe_id),`);
    parts.push(`    watchlisted_count        = COUNT(watchlisted_id),`);
    parts.push(`    watchlisted_entity_ids   = VALUES(watchlisted_id)`);
  }

  return parts.join('\n');
};
