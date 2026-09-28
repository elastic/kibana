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

  // Build a multi-value EUID column so multi-entity alerts (e.g. lateral movement with both
  // user + host context) produce one row per entity after MV_EXPAND.
  //
  // MV_APPEND(null, x) = null (null propagates from the first arg), so we use CASE to ensure
  // the leading arg is always non-null. ENTITY_TYPES order is [user, host, service]:
  //   - user present: MV_APPEND(MV_APPEND(user_euid, host_euid), service_euid)
  //   - host present: MV_APPEND(host_euid, service_euid)
  //   - otherwise: service_euid
  // Null values appended as second-arg are included in the array but filtered by WHERE below.
  // The stamped field (kibana.alert.entity.id) is preferred via COALESCE when present.
  const [first, second, third] = ENTITY_TYPES;
  parts.push(
    `| EVAL _ea_entity_id = CASE(` +
      `${first}_euid IS NOT NULL, MV_APPEND(MV_APPEND(${first}_euid, ${second}_euid), ${third}_euid), ` +
      `${second}_euid IS NOT NULL, MV_APPEND(${second}_euid, ${third}_euid), ` +
      `${third}_euid)`
  );
  parts.push(`| EVAL _ea_entity_id = COALESCE(\`kibana.alert.entity.id\`, _ea_entity_id)`);
  parts.push('| MV_EXPAND _ea_entity_id');
  parts.push('| WHERE _ea_entity_id IS NOT NULL');
  // Rename only after STATS to avoid STATS BY grouping on the mapped entity.id field
  // in the alerts index rather than our computed EUID column.
  parts.push('| STATS BY _ea_entity_id');
  parts.push('| RENAME _ea_entity_id AS `entity.id`');

  return parts;
};
