/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/common/euid_helpers';
import type { TimeRange } from './time_range';
import type { SimpleTimeWindow } from './tile_time_window';
import { evalGuardedTypedEuids } from './guarded_typed_euid_eval';
import { buildSampleTail, type TileCountQueryOptions } from './query_options';

export const ML_ANOMALIES_INDEX = '.ml-anomalies-shared*';
const ENTITY_TYPES = ['user', 'host', 'service'] as const;

const DOUBLE_TIME_RANGE: Record<TimeRange, string> = {
  '24h': '48h',
  '7d': '14d',
  '30d': '60d',
};

/** Returns the time window for the current period of the anomalies query. */
export const anomaliesWindow = (timeRange: TimeRange = '24h'): SimpleTimeWindow => ({
  from: timeRange,
});

/** Returns the time window for the previous period of the anomalies query. */
export const anomaliesPrevWindow = (timeRange: TimeRange = '24h'): SimpleTimeWindow => ({
  from: DOUBLE_TIME_RANGE[timeRange],
  to: timeRange,
});

/**
 * Builds a single ES|QL query that counts distinct entities with at least one
 * ML anomaly record within the selected time window, using a LOOKUP JOIN from
 * anomalies → entity-latest on the typed EUID (entity.id).
 *
 * Use `anomaliesWindow(timeRange)` for the current period and
 * `anomaliesPrevWindow(timeRange)` for the previous period, then pass the result
 * to this function.
 */
export const buildEntitiesWithAnomaliesCountQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string,
  window: SimpleTimeWindow = anomaliesWindow(),
  entityFilterClauses: string[] = [],
  jobIds: string[] = [],
  { includeIds = true, sampleLimit }: TileCountQueryOptions = {}
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ML_ANOMALIES_INDEX}`);

  const jobFilter =
    jobIds.length > 0 ? ` AND job_id IN (${jobIds.map((id) => `"${id}"`).join(', ')})` : '';
  const upperBoundClause = window.to ? ` AND @timestamp < NOW() - ${window.to}` : '';
  parts.push(
    `| WHERE result_type == "record" AND is_interim == false AND record_score >= 1 AND @timestamp >= NOW() - ${window.from}${upperBoundClause}${jobFilter}`
  );

  for (const entityType of ENTITY_TYPES) {
    const fieldEvals = euid.esql.getFieldEvaluations(entityType);
    if (fieldEvals) {
      parts.push(`| EVAL ${fieldEvals}`);
    }
    parts.push(`| EVAL ${euid.esql.getEuidEvaluation(entityType, `${entityType}_euid`)}`);
  }

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
  if (sampleLimit !== undefined) {
    parts.push(...buildSampleTail(sampleLimit));
  } else {
    parts.push(
      includeIds
        ? `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`
        : `| STATS value = COUNT_DISTINCT(effective_id)`
    );
  }

  return parts.join('\n');
};
