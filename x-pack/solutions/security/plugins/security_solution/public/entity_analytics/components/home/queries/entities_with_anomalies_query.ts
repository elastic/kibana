/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import type { TimeRange } from '../use_time_range_param';

const ML_ANOMALIES_INDEX = '.ml-anomalies-shared*';
const ENTITY_TYPES = ['user', 'host', 'service'] as const;

/**
 * Builds a single ES|QL query that counts distinct entities with at least one
 * ML anomaly record within the selected time window, using a LOOKUP JOIN from
 * anomalies → entity-latest on the typed EUID (entity.id).
 */
export const buildEntitiesWithAnomaliesCountQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string,
  timeRange: TimeRange = '24h',
  entityFilterClauses: string[] = []
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ML_ANOMALIES_INDEX}`);
  parts.push(
    `| WHERE result_type == "record" AND is_interim == false AND record_score >= 1 AND @timestamp >= NOW() - ${timeRange}`
  );

  for (const entityType of ENTITY_TYPES) {
    const fieldEvals = euid.esql.getFieldEvaluations(entityType);
    if (fieldEvals) {
      parts.push(`| EVAL ${fieldEvals}`);
    }
    parts.push(`| EVAL ${euid.esql.getEuidEvaluation(entityType, `${entityType}_euid`)}`);
  }

  // Build derived_euids as multi-value so a multi-typed anomaly record contributes all
  // entity types — consistent with the alerts pipeline. Nulls filtered after MV_EXPAND.
  const euidVars = ENTITY_TYPES.map((t) => `${t}_euid`);
  const nestedMvAppend = euidVars
    .slice(0, -1)
    .reduceRight((inner, v) => `MV_APPEND(${v}, ${inner})`, euidVars[euidVars.length - 1]);
  parts.push(`| EVAL derived_euids = ${nestedMvAppend}`);
  parts.push(`| MV_EXPAND derived_euids`);
  parts.push(`| EVAL entity.id = derived_euids`);
  parts.push(`| WHERE entity.id IS NOT NULL`);

  // Deduplicate to one row per entity before the LOOKUP JOIN — reduces join cardinality
  // from O(anomaly records) to O(distinct entities). @timestamp dropped here; no rename needed.
  parts.push(`| STATS BY entity.id`);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);

  parts.push(`| WHERE entity.name IS NOT NULL`);
  parts.push(...entityFilterClauses);

  parts.push(
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`
  );
  parts.push(`| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`);

  return parts.join('\n');
};
