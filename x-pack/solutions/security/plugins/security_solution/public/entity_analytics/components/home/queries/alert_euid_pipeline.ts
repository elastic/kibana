/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

const ENTITY_TYPES = ['user', 'host', 'service'] as const;

/**
 * Returns ES|QL pipeline stages that resolve entity.id for alert documents.
 *
 * Fast path: reads from `kibana.alert.entity.id`, stamped at enrichment time (#285223).
 * Fallback: derives EUID from identity fields for alerts that predate the stamp.
 *
 * For multi-entity alerts (e.g. a lateral movement rule with both user + host context):
 * - Stamped path: `kibana.alert.entity.id` is already a multi-value array — one row per entity after MV_EXPAND.
 * - Fallback path: each entity type EUID is computed independently, then combined into a
 *   multi-value field with MV_APPEND so all entity types survive — not just the first non-null.
 *
 * After MV_EXPAND the entity.id column is always scalar; nulls are filtered out so
 * non-matching entity types don't produce phantom rows downstream.
 */
export const buildAlertEuidPipeline = (euid: EntityStoreEuid): string[] => {
  const parts: string[] = [];

  for (const entityType of ENTITY_TYPES) {
    const fieldEvals = euid.esql.getFieldEvaluations(entityType);
    if (fieldEvals) {
      parts.push(`| EVAL ${fieldEvals}`);
    }
    parts.push(`| EVAL ${euid.esql.getEuidEvaluation(entityType, `${entityType}_euid`)}`);
  }

  // Build derived_euids as a multi-value field so a user+host alert contributes both
  // entities on the fallback path — COALESCE(a,b,c) would drop all but the first non-null.
  // Produces: MV_APPEND(user_euid, MV_APPEND(host_euid, service_euid))
  // Nulls from absent entity types survive but are filtered by the WHERE below.
  const euidVars = ENTITY_TYPES.map((t) => `${t}_euid`);
  const nestedMvAppend = euidVars
    .slice(0, -1)
    .reduceRight((inner, v) => `MV_APPEND(${v}, ${inner})`, euidVars[euidVars.length - 1]);
  parts.push(`| EVAL derived_euids = ${nestedMvAppend}`);
  parts.push('| EVAL entity_ids = COALESCE(`kibana.alert.entity.id`, derived_euids)');
  parts.push('| MV_EXPAND entity_ids');
  parts.push('| EVAL entity.id = entity_ids');
  parts.push('| WHERE entity.id IS NOT NULL');

  return parts;
};
