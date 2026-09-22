/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFieldEvaluationsEsql,
  getEuidEsqlEvaluation,
} from '@kbn/entity-store/common/domain/euid';
import { ALLOWED_ENTITY_TYPES } from './common';

// Evaluates identity fields and COALESCEs into entity.id.
// Used as the base for both alert and anomaly queries.
export const buildEuidStages = (): string[] => {
  const parts: string[] = [];
  for (const entityType of ALLOWED_ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) {
      parts.push(`| EVAL ${fieldEvals}`);
    }
    parts.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  parts.push(
    `| EVAL \`entity.id\` = COALESCE(${ALLOWED_ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`
  );
  parts.push('| WHERE `entity.id` IS NOT NULL');
  return parts;
};

/**
 * EUID pipeline for alert documents.
 *
 * Fast path: reads `kibana.alert.entity.id`, stamped at enrichment time (#285223).
 * Fallback: derives EUID from identity fields for alerts that predate the stamp.
 *
 * MV_EXPAND is required because `kibana.alert.entity.id` is string[] — a multi-entity
 * alert becomes one row per entity so the LOOKUP JOIN key is always scalar. For alerts
 * where the field is null (pre-#285223), MV_EXPAND produces one row with null and
 * COALESCE falls through to the derived EUID.
 */
export const buildAlertEuidPipeline = (): string[] => {
  const parts: string[] = [];
  for (const entityType of ALLOWED_ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) parts.push(`| EVAL ${fieldEvals}`);
    parts.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  parts.push(
    `| EVAL derived_euid = COALESCE(${ALLOWED_ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`
  );
  parts.push('| MV_EXPAND `kibana.alert.entity.id`');
  parts.push('| EVAL `entity.id` = COALESCE(`kibana.alert.entity.id`, derived_euid)');
  parts.push('| WHERE `entity.id` IS NOT NULL');
  return parts;
};
