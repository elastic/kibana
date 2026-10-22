/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
// The query module, not the table index: the index also loads the grid components.
import {
  ANOMALY_RECORD_FILTER,
  buildAnomalyJobFilter,
  ML_ANOMALY_INDICES,
} from '../../entities_grid/queries/esql';
import {
  buildPerTypeEuidEvals,
  evalGuardedTypedEuids,
} from '../../entities_grid/queries/euid_pipeline';
import { buildGroupFilterSteps } from './group_filter_steps';
import { buildPeriodCondition } from './tile_period';
import type { TilePeriod } from './tile_period';
import { SERIES_BUCKET_COLUMN } from './tile_series_window';

interface AnomalyTileHeadOptions {
  entitiesIndexName: string;
  /** The ES|QL condition that keeps the anomaly records of the window the query covers. */
  windowCondition: string;
  jobIds: string[];
  /** Set for the sparkline series: numbers each record by when it happened. */
  bucketExpression?: string;
}

/**
 * The stages the Entities with anomalies count and its sparkline series share, up to the resolved
 * entity: the anomaly records of the window and installed jobs, their entity ids, the join to the
 * entities and the resolution. The entity filters are not applied here: they judge the group by its
 * main entity, after the rows are grouped by `effective_id` (see `buildGroupFilterSteps`). The count
 * and the series both start here, so they cannot drift apart.
 */
export const buildAnomalyTileHead = ({
  entitiesIndexName,
  windowCondition,
  jobIds,
  bucketExpression,
}: AnomalyTileHeadOptions): string[] => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ML_ANOMALY_INDICES}`);
  parts.push(
    `| WHERE ${ANOMALY_RECORD_FILTER} AND ${windowCondition} AND ${buildAnomalyJobFilter(jobIds)}`
  );

  parts.push(...buildPerTypeEuidEvals());
  parts.push(evalGuardedTypedEuids('derived_euids'));
  parts.push(`| MV_EXPAND derived_euids`);
  parts.push(`| WHERE derived_euids IS NOT NULL`);
  if (bucketExpression) {
    parts.push(`| EVAL ${SERIES_BUCKET_COLUMN} = ${bucketExpression}`);
  }
  // STATS BY on a temp column avoids grouping on the mapped entity.id field in the anomalies
  // index rather than our computed EUID. RENAME after STATS produces entity.id for the JOIN.
  parts.push(`| STATS BY ${bucketExpression ? `${SERIES_BUCKET_COLUMN}, ` : ''}derived_euids`);
  parts.push(`| RENAME derived_euids AS \`entity.id\``);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);

  parts.push(`| WHERE entity.name IS NOT NULL`);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );

  return parts;
};

/**
 * Builds a single ES|QL query that counts distinct entities with at least one
 * ML anomaly record within the selected time window, using a LOOKUP JOIN from
 * anomalies → entity-latest on the typed EUID (entity.id).
 *
 * `period` shifts the time window back by one range ('previous'), for the period-over-period
 * delta. The previous period only needs the count, so it leaves out the entity id list.
 */
export const buildEntitiesWithAnomaliesCountQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = [],
  jobIds: string[] = [],
  period: TilePeriod = 'current'
): string => {
  const parts = buildAnomalyTileHead({
    entitiesIndexName,
    windowCondition: buildPeriodCondition('@timestamp', timeRange, period),
    jobIds,
  });
  // One row per resolved entity, because several ids can resolve to the same one. A plain COUNT of
  // those rows is exact; COUNT_DISTINCT would only estimate, and is approximate above about 3,000.
  parts.push(`| STATS BY effective_id`);
  parts.push(...buildGroupFilterSteps(entitiesIndexName, entityFilterClauses));
  if (period === 'previous') {
    // The previous period only needs the count, not the entity ids.
    parts.push(`| STATS value = COUNT(effective_id)`);
  } else {
    // VALUES(effective_id) so tile → table IN-filter matches resolved-rows entity.id
    parts.push(`| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)`);
  }

  return parts.join('\n');
};
