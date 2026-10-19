/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { ALERT_OPEN_STATUS_FILTER } from '../../entities_grid/queries/alerts';
import { getAlertsIndex } from '../../entities_grid/queries/esql';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';
import { buildGroupFilterSteps } from './group_filter_steps';
import { buildPeriodCondition } from './tile_period';
import type { TilePeriod } from './tile_period';

/**
 * Builds a single ES|QL query that computes two tiles in one pass over the alerts index:
 * - severely alerting: entities with at least one high- or critical-severity alert,
 * - watchlisted & alerting: groups with an alert of any severity and any member, the main
 *   entity or an alias, on a watchlist (the member that is watchlisted need not be the one that alerted).
 *
 * This avoids running the EUID pipeline once per tile. Each tile reads its own columns
 * from the single STATS result.
 *
 * Performance: a STATS BY entity.id deduplication step runs before the LOOKUP JOIN,
 * reducing join cardinality from O(alerts) to O(distinct entities). The @timestamp
 * rename dance is not needed because @timestamp is dropped by the deduplication STATS.
 *
 * The group's watchlist comes from the alerting member and from the aliases and main entities of
 * groups with aliases, merged with the alerts by the group id; see {@link buildAlertTilesHead}. A group qualifies for the watchlist
 * tile when it is watchlisted AND has an alert in the selected time window (based on alert
 * @timestamp, per Marios call 2025-09-18).
 *
 * COUNT and VALUES ignore null values, so nulling out non-watchlisted rows
 * is all that is needed to produce the watchlist-only aggregation.
 *
 * `period` shifts the whole window back by one range ('previous'), for the period-over-period
 * delta. The previous period only needs the counts, so it leaves out the entity id lists.
 */
/** The group is on a watchlist: the member that alerted, an alias, or the main entity is. */
export const GROUP_ON_WATCHLIST = 'COALESCE(group_on_watchlist, false)';

interface AlertTilesHeadOptions {
  /** The concrete entity index: it is read as well as the alerts, and joined to. */
  entitiesIndexName: string;
  spaceId: string;
  /** The ES|QL condition that keeps the alerts of the window the query covers. */
  windowCondition: string;
  /** Passed to the alert pipeline to get one row per (bucket, entity) for the sparkline series. */
  bucketExpression?: string;
}

const RESOLVED_TO = '`entity.relationships.resolution.resolved_to`';

/**
 * The stages the alert based tile queries share. One `FROM` reads the alerts and the entity index
 * together (FORK cannot run inside a FROM subquery, so the two are not merged as subqueries; the
 * entities grid does the same in `alerts.ts`). FORK then splits the rows three ways:
 *
 * - alerts with a stamped entity id, and alerts without one, as before;
 * - the aliases (the entity docs that have a `resolved_to`, which are few): each emits its main
 *   entity as the group and whether the alias is on a watchlist.
 *
 * The rows are then grouped per entity, joined to the entity docs (the member that alerted, or the
 * main entity of an alias row), and given the group id (`effective_id`). The entity filters are not
 * applied here: they judge the group by its main entity, after the rows are grouped by
 * `effective_id` (see {@link buildGroupFilterSteps}). The group is on
 * a watchlist (`group_on_watchlist`) when the member that alerted is, when any alias is, or when the
 * main entity is, which a group with aliases gets from its alias rows. For a single entity, which is
 * most of them, that member is the whole group.
 *
 * A group is on the Watchlisted tile when it has an alert in the window and is on a watchlist, and
 * the row stands for the main entity of the group. The count and the sparkline series both start
 * here, so they cannot drift apart.
 */
export const buildAlertTilesHead = ({
  entitiesIndexName,
  spaceId,
  windowCondition,
  bucketExpression,
}: AlertTilesHeadOptions): string[] => {
  const isEntityDoc = `_index == "${entitiesIndexName}"`;
  return [
    `SET unmapped_fields="nullify";`,
    `FROM ${getAlertsIndex(spaceId)}, ${entitiesIndexName} METADATA _index`,
    // Closed alerts are left out, as in the entities grid.
    `| WHERE (NOT ${isEntityDoc} AND ${windowCondition} AND (${ALERT_OPEN_STATUS_FILTER})) OR (${isEntityDoc} AND ${RESOLVED_TO} IS NOT NULL)`,
    ...buildAlertEuidPipeline(bucketExpression, {
      alertBranchCondition: `NOT ${isEntityDoc}`,
      extraBranch: {
        steps: [
          `WHERE ${isEntityDoc}`,
          // Alias rows are not in any bucket of the sparkline: they have no time.
          `| EVAL _ea_entity_id = ${RESOLVED_TO}, alias_watchlisted = entity.attributes.watchlists IS NOT NULL${
            bucketExpression ? ', @timestamp = TO_DATETIME(null)' : ''
          }`,
          `| KEEP _ea_entity_id, alias_watchlisted${bucketExpression ? ', @timestamp' : ''}`,
        ],
        aggregations: ['alias_watchlisted = MAX(alias_watchlisted)'],
      },
    }),
    `| LOOKUP JOIN ${entitiesIndexName} ON entity.id`,
    // Discard entity IDs that have no entity-latest record (unrecognised identifiers).
    '| WHERE entity.name IS NOT NULL',
    `| EVAL effective_id = COALESCE(${RESOLVED_TO}, entity.id), group_on_watchlist = COALESCE(alias_watchlisted, false) OR entity.attributes.watchlists IS NOT NULL`,
  ];
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
  });

  // One row per resolved group: whether any of its alerting records has a severe alert, whether it
  // has any alert, and whether any of its members is watchlisted.
  parts.push(
    `| STATS has_severe_alert = MAX(has_severe_alert), has_alert = MAX(has_alert), group_on_watchlist = MAX(group_on_watchlist) BY effective_id`
  );
  parts.push(...buildGroupFilterSteps(entitiesIndexName, entityFilterClauses));

  // Per-tile ids: null for entities outside the tile so COUNT/VALUES ignore them.
  parts.push(`| EVAL severe_id = CASE(has_severe_alert, effective_id, null)`);
  parts.push(
    `| EVAL watchlisted_id = CASE(has_alert AND ${GROUP_ON_WATCHLIST}, effective_id, null)`
  );

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
