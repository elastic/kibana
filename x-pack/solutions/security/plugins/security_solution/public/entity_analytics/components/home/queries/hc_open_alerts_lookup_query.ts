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
 * Builds a single ES|QL query that counts distinct H/C-risk entities with at
 * least one open alert, using a LOOKUP JOIN from alerts → entity-latest on the
 * typed EUID (entity.id). This mirrors the pattern used by the anomalies panel.
 *
 * Uses euidApi to generate the correct EVAL expressions for each entity type so
 * the computed EUID matches the entity store's format (including namespace/source
 * suffixes like `@example.com@okta` for IDP users or `host.id`-first for hosts).
 *
 * COALESCE priority is user > host > service per alert row. An alert matching
 * multiple entity types (e.g. has both user.name and host.name) counts only the
 * highest-priority type. This mirrors the anomalies component's behaviour and is
 * acceptable for tile counting purposes.
 */
export const buildEntitiesWithAlertsCountQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ALERTS_INDEX}`);
  parts.push(`| WHERE @timestamp >= NOW() - 24h`);

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

  // RENAME @timestamp to avoid it being overwritten by entity-latest's own @timestamp
  // during the LOOKUP JOIN (same pattern used by the anomalies panel).
  parts.push(`| RENAME @timestamp AS event_timestamp`);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  parts.push(`| RENAME event_timestamp AS @timestamp`);

  parts.push(`| WHERE entity.risk.calculated_level IN ("High", "Critical")`);
  parts.push(`| STATS value = COUNT_DISTINCT(entity.id), entity_ids = VALUES(entity.id)`);

  return parts.join('\n');
};
