/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../new_entities_table';
import { getAlertsIndex, buildLookback } from '../../new_entities_table/queries/esql';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';

/**
 * Builds a single ES|QL query that computes three tiles in one pass over the alerts index:
 * - severely alerting: entities with at least one high- or critical-severity alert,
 * - watchlisted & alerting: watchlisted entities with an alert of any severity,
 * - new & alerting: entities first seen in the window with an alert of any severity.
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
 * COUNT_DISTINCT and VALUES ignore null values, so nulling out non-watchlisted rows
 * is all that is needed to produce the watchlist-only aggregation.
 */
export const buildAlertBasedTilesQuery = (
  entitiesIndexName: string,
  spaceId: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${getAlertsIndex(spaceId)}`);
  parts.push(`| WHERE @timestamp >= ${buildLookback(timeRange)}`);
  parts.push(...buildAlertEuidPipeline());

  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  // Discard entity IDs that have no entity-latest record (unrecognised identifiers).
  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );

  // One row per resolved entity: whether any of its alerting records has a severe alert or
  // is watchlisted.
  parts.push(`| EVAL is_watchlisted = entity.attributes.watchlists IS NOT NULL`);
  parts.push(
    `| STATS has_severe_alert = MAX(has_severe_alert), is_watchlisted = MAX(is_watchlisted) BY effective_id`
  );

  // The resolved entity's own doc, for its first_seen: an alias record carries its own.
  parts.push(`| RENAME effective_id AS \`entity.id\``);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  parts.push(`| EVAL is_new = entity.lifecycle.first_seen >= ${buildLookback(timeRange)}`);

  // Per-tile ids — null for entities outside the tile so COUNT_DISTINCT/VALUES ignore them.
  parts.push(`| EVAL severe_id = CASE(has_severe_alert, entity.id, null)`);
  parts.push(`| EVAL watchlisted_id = CASE(is_watchlisted, entity.id, null)`);
  parts.push(`| EVAL new_alerting_id = CASE(is_new, entity.id, null)`);

  parts.push(`| STATS`);
  parts.push(`    severe_alerts_count      = COUNT_DISTINCT(severe_id),`);
  parts.push(`    severe_alerts_entity_ids = VALUES(severe_id),`);
  parts.push(`    watchlisted_count        = COUNT_DISTINCT(watchlisted_id),`);
  parts.push(`    watchlisted_entity_ids   = VALUES(watchlisted_id),`);
  parts.push(`    new_alerting_count       = COUNT_DISTINCT(new_alerting_id),`);
  parts.push(`    new_alerting_entity_ids  = VALUES(new_alerting_id)`);

  return parts.join('\n');
};
