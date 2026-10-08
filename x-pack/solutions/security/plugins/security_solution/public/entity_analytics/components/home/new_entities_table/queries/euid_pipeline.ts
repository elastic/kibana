/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlEvaluation, getFieldEvaluationsEsql } from './euid_esql';
import { ALLOWED_ENTITY_TYPES } from '../common';
import { evalGuardedTypedEuids } from '../../needs_attention_tiles/queries/guarded_typed_euid_eval';
import { indentForkBranch, toList } from './esql';

// ── EUID query pipeline builders ─────────────────────────────────────────────

/** `EVAL`s of the user, host and service EUIDs into `user_euid`, `host_euid`, `service_euid`. */
export const buildPerTypeEuidEvals = (): string[] =>
  ALLOWED_ENTITY_TYPES.flatMap((entityType) => {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    return [
      ...(fieldEvals ? [`| EVAL ${fieldEvals}`] : []),
      `| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`,
    ];
  });

/**
 * Derives one EUID per document into `entity.id` (first of user, host, service).
 * Anomaly queries use it: ML records do not carry `entity.id`.
 */
export const buildEuidStages = (): string[] => [
  ...buildPerTypeEuidEvals(),
  `| EVAL \`entity.id\` = COALESCE(${ALLOWED_ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`,
  '| WHERE `entity.id` IS NOT NULL',
];

export interface AlertEuidPipelineOptions {
  /** When set, the stamped branch keeps only alerts stamped with one of these entity ids. */
  stampedEntityIds?: readonly string[];
  /**
   * Exact filter for the unstamped branch: an OR of `getEuidEsqlFilterBasedOnDocument`
   * clauses. When `stampedEntityIds` is set and this is not, the unstamped branch is
   * off (`WHERE false`), so the enrich query does not scan all unstamped alerts.
   */
  unstampedIdentityClause?: string;
  /**
   * Pushable prefilter for `unstampedIdentityClause`. It must be its own top-level
   * conjunct: nested inside the clause's parentheses, ES|QL does not push it down.
   */
  unstampedIdentityPrefilter?: string;
  /** Condition both alert branches add, when the FROM also reads other indices. */
  alertBranchCondition?: string;
  /** Steps of an extra FORK branch, which must emit `_ea_entity_id` like the alert branches. */
  extraBranch?: readonly string[];
}

/**
 * Maps alert documents to `entity.id` rows. FORK splits the work:
 * - Stamped alerts copy `kibana.alert.entity.id`, which can be multi-value.
 * - Unstamped alerts derive the user, host and service EUIDs from raw fields.
 * The split keeps the EUID `EVAL`s off stamped alerts. MV_EXPAND then makes
 * `entity.id` single-value for STATS and LOOKUP JOIN.
 */
export const buildAlertEuidPipeline = (options: AlertEuidPipelineOptions = {}): string[] => {
  const {
    stampedEntityIds,
    unstampedIdentityClause,
    unstampedIdentityPrefilter,
    alertBranchCondition,
    extraBranch,
  } = options;
  const guard = alertBranchCondition ? [`(${alertBranchCondition})`] : [];
  const idsList = stampedEntityIds?.length ? toList(stampedEntityIds) : undefined;
  const keepCols = ['`@timestamp`', '`kibana.alert.severity`', '_ea_entity_id'].join(', ');

  const stampedSteps = [
    `WHERE ${[...guard, '`kibana.alert.entity.id` IS NOT NULL'].join(' AND ')}`,
    ...(idsList ? [`| WHERE \`kibana.alert.entity.id\` IN (${idsList})`] : []),
    '| EVAL _ea_entity_id = `kibana.alert.entity.id`',
    `| KEEP ${keepCols}`,
  ];

  const unstampedEvals = [...buildPerTypeEuidEvals(), evalGuardedTypedEuids('_ea_entity_id')];

  const unstampedConjuncts = [
    ...guard,
    '`kibana.alert.entity.id` IS NULL',
    ...(unstampedIdentityClause != null
      ? [
          ...(unstampedIdentityPrefilter ? [`(${unstampedIdentityPrefilter})`] : []),
          `(${unstampedIdentityClause})`,
        ]
      : []),
  ];
  const unstampedWhere =
    idsList != null && unstampedIdentityClause == null
      ? 'WHERE false'
      : `WHERE ${unstampedConjuncts.join(' AND ')}`;

  const unstampedSteps = [unstampedWhere, ...unstampedEvals, `| KEEP ${keepCols}`];

  const fork = [
    '| FORK (',
    indentForkBranch(stampedSteps.join('\n')),
    '  )',
    '  (',
    indentForkBranch(unstampedSteps.join('\n')),
    '  )',
    ...(extraBranch ? ['  (', indentForkBranch(extraBranch.join('\n')), '  )'] : []),
  ].join('\n');

  return [
    fork,
    '| MV_EXPAND _ea_entity_id',
    '| WHERE _ea_entity_id IS NOT NULL',
    '| RENAME _ea_entity_id AS `entity.id`',
  ];
};
