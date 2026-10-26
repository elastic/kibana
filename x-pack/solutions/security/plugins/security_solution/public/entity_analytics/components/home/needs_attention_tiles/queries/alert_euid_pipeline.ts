/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indentForkBranch } from '../../entities_grid/queries/esql';
import {
  buildPerTypeEuidEvals,
  evalGuardedTypedEuids,
} from '../../entities_grid/queries/euid_pipeline';

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
 *
 * Pass `bucketExpression` (for example `DATE_DIFF("hour", @timestamp, NOW()) / 6`) to keep
 * @timestamp and emit one row per (`bucket`, entity) instead, for the sparkline series. Without it
 * the output is unchanged.
 */
const KEEP_COLUMNS = '_ea_entity_id, `kibana.alert.severity`';

/** The column that holds the bucket of an alert when `bucketExpression` is given. */
export const ALERT_BUCKET_COLUMN = 'bucket';

export interface AlertEuidPipelineOptions {
  /**
   * Condition both alert branches add, when the FROM also reads the entity index. Rows of the other
   * source are not counted as alerts anyway (they have no severity); this keeps them out of the
   * alert branches so no ids are derived from them and no extra rows are joined.
   */
  alertBranchCondition?: string;
  /**
   * An extra FORK branch for the other source. Its steps must emit `_ea_entity_id` (and `@timestamp`
   * when a bucket is used) like the alert branches; `aggregations` are added to the STATS.
   */
  extraBranch?: { steps: readonly string[]; aggregations: readonly string[] };
}

export const buildAlertEuidPipeline = (
  bucketExpression?: string,
  { alertBranchCondition, extraBranch }: AlertEuidPipelineOptions = {}
): string[] => {
  const keepColumns = bucketExpression ? `${KEEP_COLUMNS}, @timestamp` : KEEP_COLUMNS;
  const guard = alertBranchCondition ? [`(${alertBranchCondition})`] : [];
  const derivedSteps = [
    `WHERE ${[...guard, '`kibana.alert.entity.id` IS NULL'].join(' AND ')}`,
    ...buildPerTypeEuidEvals(),
    evalGuardedTypedEuids('_ea_entity_id'),
    `| KEEP ${keepColumns}`,
  ];

  const fork = [
    '| FORK (',
    `    WHERE ${[...guard, '`kibana.alert.entity.id` IS NOT NULL'].join(' AND ')}`,
    '    | EVAL _ea_entity_id = `kibana.alert.entity.id`',
    `    | KEEP ${keepColumns}`,
    '  )',
    '  (',
    indentForkBranch(derivedSteps.join('\n')),
    '  )',
    ...(extraBranch ? ['  (', indentForkBranch(extraBranch.steps.join('\n')), '  )'] : []),
  ].join('\n');

  const aggregations = [
    'has_severe_alert = MAX(is_severe_alert)',
    ...(extraBranch ? ['has_alert = MAX(is_alert_row)', ...extraBranch.aggregations] : []),
  ];

  return [
    fork,
    '| MV_EXPAND _ea_entity_id',
    '| WHERE _ea_entity_id IS NOT NULL',
    '| EVAL is_severe_alert = `kibana.alert.severity` IN ("high", "critical")',
    // Rows of the other source have no severity, so they are not alerts.
    ...(extraBranch ? ['| EVAL is_alert_row = `kibana.alert.severity` IS NOT NULL'] : []),
    ...(bucketExpression ? [`| EVAL ${ALERT_BUCKET_COLUMN} = ${bucketExpression}`] : []),
    // Rename only after STATS to avoid STATS BY grouping on the mapped entity.id field
    // in the alerts index rather than our computed EUID column.
    `| STATS ${aggregations.join(', ')} BY ${
      bucketExpression ? `${ALERT_BUCKET_COLUMN}, ` : ''
    }_ea_entity_id`,
    '| RENAME _ea_entity_id AS `entity.id`',
  ];
};
