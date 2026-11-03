/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidEsqlEvaluation,
  getEuidEsqlFilterBasedOnDocument,
  getFieldEvaluationsEsql,
} from '@kbn/entity-store/common/domain/euid';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { escapeStringValue } from '@kbn/esql-utils';
import { ALLOWED_ENTITY_TYPES, ENTITY_TYPE_FIELD, getEntityIds, isOneOf } from '../common';
import type { Row } from '../common';
import { buildIdentityPrefilter, indentForkBranch } from './esql';

// ── EUID query pipeline builders ─────────────────────────────────────────────

/** `EVAL`s of the user, host and service EUIDs into `user_euid`, `host_euid`, `service_euid`. */
export const buildPerTypeEuidEvals = (): string[] =>
  ALLOWED_ENTITY_TYPES.flatMap((entityType) => {
    const definition = getBuiltInEntityDefinition(entityType);
    const fieldEvals = getFieldEvaluationsEsql(definition);
    return [
      ...(fieldEvals ? [`| EVAL ${fieldEvals}`] : []),
      `| EVAL ${getEuidEsqlEvaluation(definition, `${entityType}_euid`)}`,
    ];
  });

/**
 * ES|QL EVAL that folds `user_euid`, `host_euid`, and `service_euid` into one
 * multi-value column of the ids that are present. `MV_APPEND` returns null if any
 * argument is null, so each argument is a COALESCE that is null only when all three
 * ids are; MV_DEDUPE drops the repeats that come from the fallbacks.
 *
 * A multi-condition CASE would do the same, but ES|QL evaluates it one row at a time,
 * which made this EVAL most of the cost of the alerts tile.
 */
export const evalGuardedTypedEuids = (outputColumn: string): string =>
  [
    `| EVAL ${outputColumn} = MV_DEDUPE(MV_APPEND(MV_APPEND(`,
    '  COALESCE(user_euid, host_euid, service_euid),',
    '  COALESCE(host_euid, service_euid, user_euid)),',
    '  COALESCE(service_euid, user_euid, host_euid)))',
  ].join('\n');

/**
 * Derives one EUID per document into `entity.id` (first of user, host, service).
 * Anomaly queries use it: ML records do not carry `entity.id`.
 */
export const buildEuidStages = (): string[] => [
  ...buildPerTypeEuidEvals(),
  `| EVAL \`entity.id\` = COALESCE(${ALLOWED_ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`,
  '| WHERE `entity.id` IS NOT NULL',
];

/**
 * Keeps alerts stamped with any of the ids. An alert can be stamped with several ids, and
 * `IN` is null on a multi-value field, so each id is an `MV_CONTAINS`, which checks every value.
 */
const buildStampedIdsCondition = (entityIds: readonly string[]): string =>
  entityIds
    .map((id) => `MV_CONTAINS(\`kibana.alert.entity.id\`, ${escapeStringValue(id)})`)
    .join(' OR ');

export interface AlertEntityFilter {
  /** Stamped alerts must be stamped with one of these ids. */
  entityIds: readonly string[];
  /** Unstamped alerts must match these clauses; without them none are read, never all. */
  unstampedIdentityClause?: string;
  /** Must be its own conjunct: nested in the clause's parentheses, ES|QL won't push it down. */
  unstampedIdentityPrefilter?: string;
}

/** Older alerts lack an entity id, so they're matched by identity fields; unmatched rows are skipped. */
export const buildAlertEntityFilter = (entities: readonly Row[]): AlertEntityFilter => {
  const clauses = new Set<string>();
  const matched: Row[] = [];
  for (const entity of entities) {
    const entityType = entity[ENTITY_TYPE_FIELD];
    if (isOneOf(ALLOWED_ENTITY_TYPES, entityType)) {
      const clause = getEuidEsqlFilterBasedOnDocument(
        getBuiltInEntityDefinition(entityType),
        entity
      );
      if (clause) {
        clauses.add(clause);
        matched.push(entity);
      }
    }
  }
  return {
    entityIds: getEntityIds(entities),
    ...(clauses.size
      ? {
          unstampedIdentityClause: [...clauses].join(' OR '),
          unstampedIdentityPrefilter: buildIdentityPrefilter(matched),
        }
      : {}),
  };
};

interface UnstampedAlertBranchOptions {
  filter?: AlertEntityFilter;
  guard?: string;
}

const ALERT_KEEP_COLUMNS = ['`@timestamp`', '`kibana.alert.severity`', '_ea_entity_id'].join(', ');

/** Stamped alerts copy `kibana.alert.entity.id`, which can be multi-value. */
export const buildStampedAlertBranch = (filter?: AlertEntityFilter): string[] => [
  'WHERE `kibana.alert.entity.id` IS NOT NULL',
  ...(filter?.entityIds.length ? [`| WHERE ${buildStampedIdsCondition(filter.entityIds)}`] : []),
  '| EVAL _ea_entity_id = `kibana.alert.entity.id`',
  `| KEEP ${ALERT_KEEP_COLUMNS}`,
];

export const buildUnstampedAlertBranch = ({
  filter,
  guard,
}: UnstampedAlertBranchOptions = {}): string[] => {
  const { entityIds = [], unstampedIdentityClause, unstampedIdentityPrefilter } = filter ?? {};
  const where =
    entityIds.length && unstampedIdentityClause == null
      ? 'WHERE false'
      : `WHERE ${[
          ...(guard ? [`(${guard})`] : []),
          '`kibana.alert.entity.id` IS NULL',
          ...(unstampedIdentityClause != null
            ? [
                ...(unstampedIdentityPrefilter ? [`(${unstampedIdentityPrefilter})`] : []),
                `(${unstampedIdentityClause})`,
              ]
            : []),
        ].join(' AND ')}`;
  return [
    where,
    ...buildPerTypeEuidEvals(),
    evalGuardedTypedEuids('_ea_entity_id'),
    `| KEEP ${ALERT_KEEP_COLUMNS}`,
  ];
};

/** Each branch emits `_ea_entity_id`; MV_EXPAND then makes it single-value for STATS and joins. */
export const buildAlertForkSteps = (branches: ReadonlyArray<readonly string[]>): string[] => [
  [
    '| FORK (',
    // The first branch opens on the FORK line.
    ...branches.flatMap((branch, index) => [
      ...(index ? ['  ('] : []),
      indentForkBranch(branch.join('\n')),
      '  )',
    ]),
  ].join('\n'),
  '| MV_EXPAND _ea_entity_id',
  '| WHERE _ea_entity_id IS NOT NULL',
  '| RENAME _ea_entity_id AS `entity.id`',
];

/** FORK keeps the costly EUID evals off stamped alerts, which already carry their entity id. */
export const buildAlertEuidPipeline = (filter?: AlertEntityFilter): string[] =>
  buildAlertForkSteps([buildStampedAlertBranch(filter), buildUnstampedAlertBranch({ filter })]);
