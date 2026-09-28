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

  // Combine the stamped fast-path (already multi-value) with each derived EUID using MV_APPEND.
  // MV_EXPAND then produces one row per entity per alert, so multi-entity alerts (e.g. lateral
  // movement with both user + host context) contribute a row for each entity type rather than
  // only the first non-null. Null entries produced by MV_APPEND are filtered by the WHERE below.
  let combined = '`kibana.alert.entity.id`';
  for (const entityType of ENTITY_TYPES) {
    combined = `MV_APPEND(${combined}, ${entityType}_euid)`;
  }
  parts.push(`| EVAL _ea_entity_id = ${combined}`);
  parts.push('| MV_EXPAND _ea_entity_id');
  parts.push('| WHERE _ea_entity_id IS NOT NULL');
  // Rename only after STATS to avoid STATS BY grouping on the mapped entity.id field
  // in the alerts index rather than our computed EUID column.
  parts.push('| STATS BY _ea_entity_id');
  parts.push('| RENAME _ea_entity_id AS `entity.id`');

  return parts;
};
