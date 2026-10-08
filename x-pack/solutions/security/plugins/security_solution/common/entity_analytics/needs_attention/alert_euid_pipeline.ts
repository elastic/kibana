/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/common/euid_helpers';
import { evalGuardedTypedEuids } from './guarded_typed_euid_eval';

const ENTITY_TYPES = ['user', 'host', 'service'] as const;

const indentBranch = (esql: string): string =>
  esql
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

/**
 * Returns ES|QL pipeline stages that resolve entity.id for alert documents.
 *
 * Stamped vs derived work is split with FORK so we do not always pay for EUID
 * `EVAL`s. `COALESCE` after a shared EVAL would still compute every branch.
 *
 * - Stamped (`kibana.alert.entity.id` from enrichment, #285223): copy that field.
 *   It may already be a multi-value array.
 * - Unstamped (alerts that predate the stamp): derive user/host/service EUIDs and
 *   combine them with null-guarded CASE+MV_APPEND so every present type survives.
 *
 * Do not LIMIT inside the branches — a later STATS must see every matching alert.
 *
 * After MV_EXPAND the entity.id column is always scalar; nulls are filtered out so
 * non-matching entity types don't produce phantom rows downstream.
 *
 * Pass `bucket` (a `STATS ... BY` grouping such as `bucket = BUCKET(@timestamp, 1 hour)`) to
 * keep @timestamp through the FORK and deduplicate per bucket and entity instead of per entity,
 * which gives one row per (bucket, entity.id) for a sparkline series.
 */
export const buildAlertEuidPipeline = (euid: EntityStoreEuid, bucket?: string): string[] => {
  const keepColumns = bucket ? '_ea_entity_id, @timestamp' : '_ea_entity_id';
  const derivedSteps: string[] = ['WHERE `kibana.alert.entity.id` IS NULL'];

  for (const entityType of ENTITY_TYPES) {
    const fieldEvals = euid.esql.getFieldEvaluations(entityType);
    if (fieldEvals) {
      derivedSteps.push(`| EVAL ${fieldEvals}`);
    }
    derivedSteps.push(`| EVAL ${euid.esql.getEuidEvaluation(entityType, `${entityType}_euid`)}`);
  }
  derivedSteps.push(evalGuardedTypedEuids('_ea_entity_id'));
  derivedSteps.push(`| KEEP ${keepColumns}`);

  const fork = [
    '| FORK (',
    '    WHERE `kibana.alert.entity.id` IS NOT NULL',
    '    | EVAL _ea_entity_id = `kibana.alert.entity.id`',
    `    | KEEP ${keepColumns}`,
    '  )',
    '  (',
    indentBranch(derivedSteps.join('\n')),
    '  )',
  ].join('\n');

  return [
    fork,
    '| MV_EXPAND _ea_entity_id',
    '| WHERE _ea_entity_id IS NOT NULL',
    // Rename only after STATS to avoid STATS BY grouping on the mapped entity.id field
    // in the alerts index rather than our computed EUID column.
    bucket ? `| STATS BY ${bucket}, _ea_entity_id` : '| STATS BY _ea_entity_id',
    '| RENAME _ea_entity_id AS `entity.id`',
  ];
};
