/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import type { TimeRange } from '../../use_time_range_param';
import { ML_ANOMALIES_INDEX } from './entities_with_anomalies_query';
import { evalGuardedTypedEuids } from './guarded_typed_euid_eval';
import {
  TRAILING_WINDOW,
  trailingBucketGrouping,
  trailingFetchHours,
} from './tile_trailing_window';
import { trailingDotFilter } from './tile_trailing_dots';

const ENTITY_TYPES = ['user', 'host', 'service'] as const;

/** Returns the result column of dot `k` (0 = newest) for the Entities with anomalies tile. */
export const trailingAnomaliesColumn = (k: number): string => `anomalies_${k}`;

/**
 * Builds one query that returns every sparkline dot of the Entities with anomalies tile as columns
 * of a single row, where dot `k` is what the tile would have shown `k` steps ago.
 *
 * It is the tile's count query (same record filter, EUID derivation, LOOKUP JOIN and resolution
 * dedupe) with the pre-join dedupe done per (bucket, entity), then each dot counts the distinct
 * entities in the buckets of its trailing window (the selected time range).
 */
export const buildEntitiesWithAnomaliesTrailingSeriesQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = [],
  jobIds: string[] = []
): string => {
  const { dots } = TRAILING_WINDOW[timeRange];
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ML_ANOMALIES_INDEX}`);

  const jobFilter =
    jobIds.length > 0 ? ` AND job_id IN (${jobIds.map((id) => `"${id}"`).join(', ')})` : '';
  parts.push(
    `| WHERE result_type == "record" AND is_interim == false AND record_score >= 1 AND @timestamp >= NOW() - ${trailingFetchHours(
      timeRange
    )}h${jobFilter}`
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
  parts.push(`| STATS BY ${trailingBucketGrouping(timeRange)}, derived_euids`);
  parts.push(`| RENAME derived_euids AS \`entity.id\``);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);

  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );

  const aggregations = Array.from(
    { length: dots },
    (_, k) =>
      `${trailingAnomaliesColumn(k)} = COUNT_DISTINCT(effective_id) ${trailingDotFilter(
        timeRange,
        k
      )}`
  );
  parts.push(`| STATS`);
  parts.push(`    ${aggregations.join(',\n    ')}`);

  return parts.join('\n');
};
