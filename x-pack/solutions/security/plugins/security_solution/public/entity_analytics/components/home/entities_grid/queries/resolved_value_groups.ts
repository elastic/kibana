/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLUTION_RISK_LEVEL_FIELD, RISK_LEVEL_FIELD, getNumber } from '../common';
import type { QueryArgs } from '../common';
import { ESQL_MAX_RESULT_ROWS } from './esql';
import { buildEntitiesInViewSteps } from './entities_in_view';
import { buildResolvedValueBuckets, fetchResolvedEntityValueChanges } from './resolved_entities';
import type { ResolvedValueBucket } from './resolved_entities';
import type { EsqlRunner } from './types';

type ResolvedValueGroupsArgs = Pick<
  QueryArgs,
  'namespace' | 'concreteEntityIndexName' | 'searchExpression' | 'entityExpression'
>;

export interface ResolvedValueGroups {
  buckets: ResolvedValueBucket[];
  /** Resolved rows in view; buckets of multi-value fields overlap, so not their sum. */
  total: number;
  /** The read hit the ES|QL row limit, so values (and their rows) may be missing. */
  isTruncated: boolean;
}

/** A resolved row's risk level is its group's, else its own: both are stored on the main entity. */
const getGroupedValue = (field: string): string =>
  field === RISK_LEVEL_FIELD
    ? `COALESCE(${RESOLUTION_RISK_LEVEL_FIELD}, ${RISK_LEVEL_FIELD})`
    : field;

/** Resolved rows in view per stored value; `STATS … BY` counts a multi-value doc once per value. */
export const buildOwnValueCountsQuery = (
  args: ResolvedValueGroupsArgs,
  field: string
): string[] => [
  ...buildEntitiesInViewSteps({ ...args, rowsMode: 'resolved' }),
  `| STATS n = COUNT(*) BY group_value = ${getGroupedValue(field)}`,
  `| LIMIT ${ESQL_MAX_RESULT_ROWS}`,
];

const buildResolvedRowsTotalQuery = (args: ResolvedValueGroupsArgs): string[] => [
  ...buildEntitiesInViewSteps({ ...args, rowsMode: 'resolved' }),
  '| STATS total = COUNT(*)',
];

/**
 * Group by buckets of resolved rows by the group's values: the main entities' own values, moved
 * by the resolved entities whose group shows other values. Risk level needs no move, as the
 * group's level is stored on the main entity.
 */
export const fetchResolvedValueGroups = async (
  args: ResolvedValueGroupsArgs,
  field: string,
  runQuery: EsqlRunner
): Promise<ResolvedValueGroups> => {
  const [ownRows, [totalRow], changes] = await Promise.all([
    runQuery(buildOwnValueCountsQuery(args, field)),
    runQuery(buildResolvedRowsTotalQuery(args)),
    field === RISK_LEVEL_FIELD ? [] : fetchResolvedEntityValueChanges(args, runQuery),
  ]);
  const ownCounts = ownRows.map((row) => ({
    value: typeof row.group_value === 'string' ? row.group_value : null,
    count: getNumber(row, 'n') ?? 0,
  }));
  return {
    buckets: buildResolvedValueBuckets({ field, ownCounts, changes }),
    total: (totalRow && getNumber(totalRow, 'total')) ?? 0,
    isTruncated: ownRows.length >= ESQL_MAX_RESULT_ROWS,
  };
};
