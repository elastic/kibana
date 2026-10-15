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
import { buildPeriodCondition } from './tile_period';
import type { TilePeriod } from './tile_period';

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
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ML_ANOMALY_INDICES}`);
  parts.push(
    `| WHERE ${ANOMALY_RECORD_FILTER} AND ${buildPeriodCondition(
      '@timestamp',
      timeRange,
      period
    )} AND ${buildAnomalyJobFilter(jobIds)}`
  );

  parts.push(...buildPerTypeEuidEvals());
  parts.push(evalGuardedTypedEuids('derived_euids'));
  parts.push(`| MV_EXPAND derived_euids`);
  parts.push(`| WHERE derived_euids IS NOT NULL`);
  // STATS BY on a temp column avoids grouping on the mapped entity.id field in the anomalies
  // index rather than our computed EUID. RENAME after STATS produces entity.id for the JOIN.
  parts.push(`| STATS BY derived_euids`);
  parts.push(`| RENAME derived_euids AS \`entity.id\``);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);

  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );
  // One row per resolved entity, because several ids can resolve to the same one. A plain COUNT of
  // those rows is exact; COUNT_DISTINCT would only estimate, and is approximate above about 3,000.
  parts.push(`| STATS BY effective_id`);
  if (period === 'previous') {
    // The previous period only needs the count, not the entity ids.
    parts.push(`| STATS value = COUNT(effective_id)`);
  } else {
    // VALUES(effective_id) so tile → table IN-filter matches resolved-rows entity.id
    parts.push(`| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)`);
  }

  return parts.join('\n');
};
