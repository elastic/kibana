/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';

export const ALERTS_INDEX = '.alerts-security.alerts-default';

/**
 * Builds a single ES|QL query that counts distinct non-H/C entities whose
 * maximum alert risk score in the last 30 days is >= 70, using a LOOKUP JOIN
 * from alerts → entity-latest on the typed EUID (entity.id).
 *
 * Entity resolution uses kibana.alert.entity.id (stamped at enrichment time, #285223)
 * when present, falling back to derived EUID for older alerts. See alert_euid_pipeline.ts.
 * The fallback is load-bearing for the full 30d window until #285223 has aged in
 * (~2026-10-01 for new installs).
 */
export const buildHiddenRiskCountQuery = (
  euid: EntityStoreEuid,
  entitiesIndexName: string
): string => {
  const parts: string[] = [];

  parts.push(`SET unmapped_fields="nullify";`);
  parts.push(`FROM ${ALERTS_INDEX}`);
  parts.push(`| WHERE @timestamp >= NOW() - 30d`);
  parts.push(...buildAlertEuidPipeline(euid));

  parts.push(`| RENAME @timestamp AS event_timestamp`);
  parts.push(`| LOOKUP JOIN ${entitiesIndexName} ON entity.id`);
  parts.push(`| RENAME event_timestamp AS @timestamp`);

  parts.push(`| WHERE entity.risk.calculated_level NOT IN ("High", "Critical")`);
  parts.push(`| STATS max_score = MAX(kibana.alert.risk_score) BY entity.id`);
  parts.push(`| WHERE max_score >= 70`);
  parts.push(`| STATS value = COUNT(*), entity_ids = VALUES(entity.id)`);

  return parts.join('\n');
};
