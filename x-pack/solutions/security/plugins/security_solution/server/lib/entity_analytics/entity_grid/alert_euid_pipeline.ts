/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// https://github.com/CAWilson94/kibana/blob/c3788a5d69bbdd3cc06295db58c7744508e307c4/x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/home/queries/alert_euid_pipeline.ts

import {
  getFieldEvaluationsEsql,
  getEuidEsqlEvaluation,
} from '@kbn/entity-store/common/domain/euid';

const ENTITY_TYPES = ['user', 'host', 'service'] as const;
type AlertEntityType = (typeof ENTITY_TYPES)[number];

/**
 * Returns ES|QL pipeline stages that resolve entity.id for alert documents.
 *
 * Fast path: reads from `kibana.alert.entity.id`, stamped at enrichment time (#285223).
 * Fallback: derives EUID from identity fields for alerts that predate the stamp.
 *
 * MV_EXPAND is required because `kibana.alert.entity.id` is string[] — a multi-entity
 * alert becomes one row per entity so the LOOKUP JOIN key is always scalar. For alerts
 * where the field is null (pre-#285223), MV_EXPAND produces one row with null and
 * COALESCE falls through to the derived EUID.
 */
// Shared EUID derivation stages: evaluates identity fields and COALESCEs into entity.id.
// Used as the base for both alert and anomaly pipelines.
const buildBaseEuidStages = (): string[] => {
  const parts: string[] = [];
  for (const entityType of ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) {
      parts.push(`| EVAL ${fieldEvals}`);
    }
    parts.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  parts.push(
    `| EVAL \`entity.id\` = COALESCE(${(ENTITY_TYPES as readonly AlertEntityType[])
      .map((t) => `${t}_euid`)
      .join(', ')})`
  );
  parts.push('| WHERE `entity.id` IS NOT NULL');
  return parts;
};

/**
 * EUID pipeline for anomaly documents. No MV_EXPAND needed — anomalies carry
 * no `kibana.alert.entity.id` stamp. Prepend `SET unmapped_fields="nullify"` when
 * building the full query to handle heterogeneous .ml-anomalies-* index mappings.
 */
export const buildAnomalyEuidPipeline = (): string[] => buildBaseEuidStages();

export const buildAlertEuidPipeline = (): string[] => {
  const parts: string[] = [];
  for (const entityType of ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) parts.push(`| EVAL ${fieldEvals}`);
    parts.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  parts.push(
    `| EVAL derived_euid = COALESCE(${(ENTITY_TYPES as readonly AlertEntityType[])
      .map((t) => `${t}_euid`)
      .join(', ')})`
  );
  parts.push('| MV_EXPAND `kibana.alert.entity.id`');
  parts.push('| EVAL `entity.id` = COALESCE(`kibana.alert.entity.id`, derived_euid)');
  parts.push('| WHERE `entity.id` IS NOT NULL');
  return parts;
};
