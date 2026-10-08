/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indentForkBranch } from '../../new_entities_table/queries/esql';
import { buildPerTypeEuidEvals } from '../../new_entities_table/queries/euid_pipeline';
import { evalGuardedTypedEuids } from './guarded_typed_euid_eval';

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
 * Emits one row per entity with `has_severe_alert`: whether any of its alerts is high
 * or critical severity.
 */
const KEEP_COLUMNS = '_ea_entity_id, `kibana.alert.severity`';

export const buildAlertEuidPipeline = (): string[] => {
  const derivedSteps = [
    'WHERE `kibana.alert.entity.id` IS NULL',
    ...buildPerTypeEuidEvals(),
    evalGuardedTypedEuids('_ea_entity_id'),
    `| KEEP ${KEEP_COLUMNS}`,
  ];

  const fork = [
    '| FORK (',
    '    WHERE `kibana.alert.entity.id` IS NOT NULL',
    '    | EVAL _ea_entity_id = `kibana.alert.entity.id`',
    `    | KEEP ${KEEP_COLUMNS}`,
    '  )',
    '  (',
    indentForkBranch(derivedSteps.join('\n')),
    '  )',
  ].join('\n');

  return [
    fork,
    '| MV_EXPAND _ea_entity_id',
    '| WHERE _ea_entity_id IS NOT NULL',
    '| EVAL is_severe_alert = `kibana.alert.severity` IN ("high", "critical")',
    // Rename only after STATS to avoid STATS BY grouping on the mapped entity.id field
    // in the alerts index rather than our computed EUID column.
    '| STATS has_severe_alert = MAX(is_severe_alert) BY _ea_entity_id',
    '| RENAME _ea_entity_id AS `entity.id`',
  ];
};
