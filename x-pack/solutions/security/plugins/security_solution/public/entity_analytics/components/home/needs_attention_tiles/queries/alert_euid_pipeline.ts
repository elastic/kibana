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
 * - Fallback path: each entity type EUID is computed independently. A null-safe CASE+MV_APPEND
 *   pattern (same as maintainers/owns/configs.ts) combines the present EUIDs into a multi-value
 *   field. MV_APPEND returns null when ANY argument is null, so every call is guarded by an IS NOT
 *   NULL check on both operands — ensuring all present entity types survive, not just the first.
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

  // Build a multi-value EUID column so multi-entity alerts (user + host) contribute both EUIDs.
  // MV_APPEND returns null when ANY argument is null (see maintainers/owns/configs.ts), so we
  // use CASE to guard every MV_APPEND call — only invoking it when both operands are non-null.
  parts.push(
    [
      '| EVAL _ea_entity_id = CASE(',
      '  user_euid IS NOT NULL AND host_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(MV_APPEND(user_euid, host_euid), service_euid),',
      '  user_euid IS NOT NULL AND host_euid IS NOT NULL, MV_APPEND(user_euid, host_euid),',
      '  user_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(user_euid, service_euid),',
      '  host_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(host_euid, service_euid),',
      '  user_euid IS NOT NULL, user_euid,',
      '  host_euid IS NOT NULL, host_euid,',
      '  service_euid',
      ')',
    ].join('\n')
  );
  // Fast-path: kibana.alert.entity.id is stamped at enrichment time (#285223) and may already
  // be a multi-value array. Prefer it over our derived multi-value when it is present.
  parts.push('| EVAL _ea_entity_id = COALESCE(`kibana.alert.entity.id`, _ea_entity_id)');
  parts.push('| MV_EXPAND _ea_entity_id');
  parts.push('| WHERE _ea_entity_id IS NOT NULL');
  // Rename only after STATS to avoid STATS BY grouping on the mapped entity.id field
  // in the alerts index rather than our computed EUID column.
  parts.push('| STATS BY _ea_entity_id');
  parts.push('| RENAME _ea_entity_id AS `entity.id`');

  return parts;
};
