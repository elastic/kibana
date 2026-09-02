/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

export const ALERTS_INDEX = '.alerts-security.alerts-default';
const ENTITY_TYPES = ['user', 'host', 'service'] as const;

/**
 * Builds a single ES|QL query that counts distinct non-H/C entities whose
 * maximum alert risk score in the last 30 days is >= 70, using a LOOKUP JOIN
 * from alerts → entity-latest on the typed EUID (entity.id).
 */
export const buildHiddenRiskCountQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ALERTS_INDEX}`);
  parts.push(`| WHERE @timestamp >= NOW() - 30d`);

  for (const entityType of ENTITY_TYPES) {
    const fieldEvals = euid.esql.getFieldEvaluations(entityType);
    if (fieldEvals) {
      parts.push(`| EVAL ${fieldEvals}`);
    }
    parts.push(`| EVAL ${euid.esql.getEuidEvaluation(entityType, `${entityType}_euid`)}`);
  }

  parts.push(
    `| EVAL entity.id = COALESCE(${ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`
  );
  parts.push(`| WHERE entity.id IS NOT NULL`);

  parts.push(`| RENAME @timestamp AS event_timestamp`);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  parts.push(`| RENAME event_timestamp AS @timestamp`);

  parts.push(`| WHERE entity.risk.calculated_level NOT IN ("High", "Critical")`);
  parts.push(`| STATS max_score = MAX(kibana.alert.risk_score) BY entity.id`);
  parts.push(`| WHERE max_score >= 70`);
  parts.push(`| STATS value = COUNT(*), entity_ids = VALUES(entity.id)`);

  return parts.join('\n');
};
