/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../new_entities_table';
// The query module, not the table index: the index also loads the grid components.
import {
  ANOMALY_RECORD_FILTER,
  buildAnomalyJobFilter,
  buildLookback,
  ML_ANOMALY_INDICES,
} from '../../new_entities_table/queries/esql';
import { buildPerTypeEuidEvals } from '../../new_entities_table/queries/euid_pipeline';
import { evalGuardedTypedEuids } from './guarded_typed_euid_eval';

/**
 * Builds a single ES|QL query that counts distinct entities with at least one
 * ML anomaly record within the selected time window, using a LOOKUP JOIN from
 * anomalies → entity-latest on the typed EUID (entity.id).
 */
export const buildEntitiesWithAnomaliesCountQuery = (
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = [],
  jobIds: string[] = []
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ML_ANOMALY_INDICES}`);
  parts.push(
    `| WHERE ${ANOMALY_RECORD_FILTER} AND @timestamp >= ${buildLookback(
      timeRange
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
  // VALUES(effective_id) so tile → table IN-filter matches resolved-rows entity.id
  parts.push(`| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(effective_id)`);

  return parts.join('\n');
};
