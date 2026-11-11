/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlDocumentsContainsIdFilter } from '@kbn/entity-store/common/domain/euid';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { escapeStringValue } from '@kbn/esql-utils';
import { ALLOWED_ENTITY_TYPES } from '../entities_grid/common';
import { buildPerTypeEuidEvals, evalGuardedTypedEuids } from './euid_evals';

/**
 * Alerts the entity store accepts as that type's entity (its `documentsFilter`). The fields are not
 * cast: the alerts and the entity index map them the same way, and a cast would keep ES|QL from
 * pushing the filter down to Lucene.
 */
const buildEntityAcceptanceCondition = (
  entityType: (typeof ALLOWED_ENTITY_TYPES)[number]
): string =>
  `(${getEuidEsqlDocumentsContainsIdFilter(getBuiltInEntityDefinition(entityType), {
    castFields: false,
  })})`;

/** Alerts accepted as at least one allowed type, so alerts with no identity skip the EVALs. */
const buildAnyEntityIdentityCondition = (): string =>
  ALLOWED_ENTITY_TYPES.map(buildEntityAcceptanceCondition).join(' OR ');

/**
 * The OR above only says that some type accepts the alert, so each EUID is nulled unless its own
 * type accepts it. Otherwise a host field would keep a failed-outcome user alert counted as a user.
 */
const evalAcceptedTypedEuids = (): string =>
  `| EVAL ${ALLOWED_ENTITY_TYPES.map(
    (entityType) =>
      `${entityType}_euid = CASE(${buildEntityAcceptanceCondition(entityType)}, ${entityType}_euid)`
  ).join(', ')}`;

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

/** Steps can span several lines, so every line is indented, not only each step's first. */
const indentForkBranch = (branch: readonly string[]): string =>
  branch
    .join('\n')
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

interface AlertBranchOptions {
  /** The columns the branch keeps; it must include `_ea_entity_id`. */
  keepColumns: string;
  /** Narrows the branch to the alerts of some entities. */
  filter?: AlertEntityFilter;
  /** Condition both alert branches add, when the FROM also reads the entity index. */
  guard?: string;
}

const buildAlertBranchWhere = (guard: string | undefined, conditions: readonly string[]): string =>
  `WHERE ${[...(guard ? [`(${guard})`] : []), ...conditions].join(' AND ')}`;

/** Stamped alerts copy `kibana.alert.entity.id`, which can be multi-value. */
const buildStampedAlertBranch = ({ keepColumns, filter, guard }: AlertBranchOptions): string[] => [
  buildAlertBranchWhere(guard, ['`kibana.alert.entity.id` IS NOT NULL']),
  ...(filter?.entityIds.length ? [`| WHERE ${buildStampedIdsCondition(filter.entityIds)}`] : []),
  // An unmapped alerts field is nullified to NULL. FORK then rejects the branch because the
  // derived EUIDs are KEYWORD. The cast keeps this branch KEYWORD when the alerts index is absent.
  '| EVAL _ea_entity_id = `kibana.alert.entity.id`::KEYWORD',
  `| KEEP ${keepColumns}`,
];

/**
 * Alerts that predate the stamp: derive the user, host and service EUIDs and keep every one that
 * is present. Each condition is its own conjunct, so ES|QL can push it down and skip alerts before
 * the EVALs.
 */
const buildUnstampedAlertBranch = ({
  keepColumns,
  filter,
  guard,
}: AlertBranchOptions): string[] => {
  const { entityIds = [], unstampedIdentityClause, unstampedIdentityPrefilter } = filter ?? {};
  const isNarrowedToNothing = entityIds.length > 0 && unstampedIdentityClause == null;
  return [
    isNarrowedToNothing
      ? 'WHERE false'
      : buildAlertBranchWhere(guard, [
          '`kibana.alert.entity.id` IS NULL',
          `(${buildAnyEntityIdentityCondition()})`,
          ...(unstampedIdentityClause != null
            ? [
                ...(unstampedIdentityPrefilter ? [`(${unstampedIdentityPrefilter})`] : []),
                `(${unstampedIdentityClause})`,
              ]
            : []),
        ]),
    ...buildPerTypeEuidEvals(),
    evalAcceptedTypedEuids(),
    evalGuardedTypedEuids('_ea_entity_id'),
    `| KEEP ${keepColumns}`,
  ];
};

export interface AlertEntityRowsOptions extends AlertBranchOptions {
  /** Further FORK branches for another source of the FROM; each must emit `_ea_entity_id`. */
  extraBranches?: ReadonlyArray<readonly string[]>;
}

/**
 * One row per (alert, entity) in `_ea_entity_id`: a stamped alert is a row of each id it carries,
 * and an unstamped one of each entity its fields name. The FORK keeps the costly EUID evals off
 * stamped alerts. Do not LIMIT or aggregate in the branches: a later STATS must see every alert.
 * MV_EXPAND makes the column single-value; rows with no entity are dropped.
 */
export const buildAlertEntityRows = ({
  extraBranches = [],
  ...branchOptions
}: AlertEntityRowsOptions): string[] => [
  [
    '| FORK (',
    ...[
      buildStampedAlertBranch(branchOptions),
      buildUnstampedAlertBranch(branchOptions),
      ...extraBranches,
    ].flatMap((branch, index) => [
      // The first branch opens on the FORK line.
      ...(index ? ['  ('] : []),
      indentForkBranch(branch),
      '  )',
    ]),
  ].join('\n'),
  '| MV_EXPAND _ea_entity_id',
  '| WHERE _ea_entity_id IS NOT NULL',
];
