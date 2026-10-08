/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlEvaluation, getFieldEvaluationsEsql } from '../euid_esql';
import { ALLOWED_ENTITY_TYPES } from '../common';
import { toList } from './esql';

// ── EUID query pipeline builders ─────────────────────────────────────────────

/**
 * Derives one EUID per document into `entity.id` (first of user, host, service).
 * Anomaly queries use it: ML records do not carry `entity.id`.
 */
export const buildEuidStages = (): string[] => {
  const parts: string[] = [];
  for (const entityType of ALLOWED_ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) parts.push(`| EVAL ${fieldEvals}`);
    parts.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  parts.push(
    `| EVAL \`entity.id\` = COALESCE(${ALLOWED_ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`
  );
  parts.push('| WHERE `entity.id` IS NOT NULL');
  return parts;
};

/**
 * Puts the user, host and service EUIDs into one multi-value column.
 * `MV_APPEND` returns null when an argument is null. Each slot is a rotated COALESCE,
 * which is not null when any EUID exists, and MV_DEDUPE removes the repeats.
 * This is about 3.5x faster than a CASE over every null combination.
 */
const buildTypedEuidsEval = (outputColumn: string): string =>
  [
    `| EVAL ${outputColumn} = MV_DEDUPE(MV_APPEND(MV_APPEND(`,
    '  COALESCE(user_euid, host_euid, service_euid),',
    '  COALESCE(host_euid, service_euid, user_euid)),',
    '  COALESCE(service_euid, user_euid, host_euid)))',
  ].join('\n');

const indentForkBranch = (esql: string): string =>
  esql
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

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

  const unstampedEvals: string[] = [];
  for (const entityType of ALLOWED_ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) unstampedEvals.push(`| EVAL ${fieldEvals}`);
    unstampedEvals.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  unstampedEvals.push(buildTypedEuidsEval('_ea_entity_id'));

  let unstampedWhere: string;
  if (idsList != null && unstampedIdentityClause == null) {
    unstampedWhere = 'WHERE false';
  } else if (unstampedIdentityClause != null) {
    const conjuncts = [
      ...guard,
      '`kibana.alert.entity.id` IS NULL',
      ...(unstampedIdentityPrefilter ? [`(${unstampedIdentityPrefilter})`] : []),
      `(${unstampedIdentityClause})`,
    ];
    unstampedWhere = `WHERE ${conjuncts.join(' AND ')}`;
  } else {
    unstampedWhere = `WHERE ${[...guard, '`kibana.alert.entity.id` IS NULL'].join(' AND ')}`;
  }

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
