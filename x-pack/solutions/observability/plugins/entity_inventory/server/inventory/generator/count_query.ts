/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { quoteIdentifier } from './esql_syntax';
import { ENTITY_ID_COLUMN, resolveIdentityPlan } from './identity';
import type { IdentityPlan } from './identity';
import { assertParses } from './parse_guard';
import type { GeneratedQuery, NamedParams, QueryPlan, TimeWindow } from './types';

/** The column holding the number of distinct entities. */
export const COUNT_COLUMN = 'count';

/** The column holding the number of raw identity groups before they are merged by id. */
export const RAW_GROUPS_COLUMN = 'raw_groups';

/** What the count query is built from: the plans, the resolved identity and the window. */
export interface BuildCountQueryInput {
  plans: QueryPlan[];
  identity: IdentityPlan;
  window: TimeWindow;
}

const TIMESTAMP = quoteIdentifier('@timestamp');
const INDEX = quoteIdentifier('_index');
// Never selected by the caller; it only carries the per-id group count between two `STATS`.
const ROWS = quoteIdentifier('rows');

// One parameter per concrete index, named after the plan and the position: `?i<plan>_<n>`. The
// leading `i` keeps the names apart from `?from` and `?to`.
const indexParamName = (planIndex: number, position: number): string => `i${planIndex}_${position}`;

// `_index` holds the concrete index name, which is exactly what the resolver returned for the plan.
const planPredicate = ({ index, indices, filter }: QueryPlan): string => {
  const indexMatches = `${INDEX} IN (${indices
    .map((_name, position) => `?${indexParamName(index, position)}`)
    .join(', ')})`;
  return filter === undefined ? `(${indexMatches})` : `(${indexMatches} AND (${filter}))`;
};

// A single plan over its whole pattern is selected by the source list alone, so only its filter
// remains. Otherwise each document must pass the filter of the plan whose indices hold it: several
// plans share a `FROM`, and a plan split from its source covers only part of its pattern.
const needsIndexClause = (plans: QueryPlan[]): boolean =>
  plans.length > 1 || plans[0].queryTarget === 'indices';

const sourcePredicate = (plans: QueryPlan[]): string | undefined => {
  if (!needsIndexClause(plans)) {
    const [{ filter }] = plans;
    return filter === undefined ? undefined : `(${filter})`;
  }
  return `(${plans.map(planPredicate).join(' OR ')})`;
};

const indexParams = (plans: QueryPlan[]): NamedParams =>
  needsIndexClause(plans)
    ? plans.flatMap(({ index, indices }) =>
        indices.map((name, position) => ({ [indexParamName(index, position)]: name }))
      )
    : [];

/**
 * Builds the query counting the distinct entities across every plan in the window, as a single
 * `FROM` over the deduplicated patterns, in a column named {@link COUNT_COLUMN}, with the raw
 * identity groups behind them in {@link RAW_GROUPS_COLUMN}.
 */
export const buildCountQuery = ({
  plans,
  identity,
  window,
}: BuildCountQueryInput): GeneratedQuery => {
  if (plans.length === 0) {
    throw new Error('the count query needs at least one plan');
  }
  const { groupingFields, presenceFilter, idEvaluation } = identity;
  const patterns = [...new Set(plans.map(({ indexPattern }) => indexPattern))];
  // Bare: Elasticsearch rejects a quoted name in `METADATA` ("Unresolved metadata pattern").
  const metadata = needsIndexClause(plans) ? ' METADATA _index' : '';
  const predicates = [
    `${TIMESTAMP} >= ?from AND ${TIMESTAMP} < ?to`,
    presenceFilter,
    sourcePredicate(plans),
  ].filter((predicate): predicate is string => predicate !== undefined);
  const countColumn = quoteIdentifier(COUNT_COLUMN);
  const rawGroupsColumn = quoteIdentifier(RAW_GROUPS_COLUMN);
  // A single field maps groups to ids one to one, so the groups are counted directly and the two
  // columns are equal. With several fields two groups can share an id (a ranking falls back to
  // another field, a composition `CONCAT(a, "/", b)` joins `("a/b", "c")` and `("a", "b/c")`), so
  // the groups are counted per id and the ids counted exactly, matching the merged list;
  // `COUNT_DISTINCT` would be approximate. `SUM` over no rows is null, hence the `COALESCE`.
  const tail =
    groupingFields.length > 1
      ? [
          `| EVAL ${idEvaluation}`,
          `| STATS ${ROWS} = COUNT(*) BY ${quoteIdentifier(ENTITY_ID_COLUMN)}`,
          `| STATS ${countColumn} = COUNT(*), ${rawGroupsColumn} = COALESCE(SUM(${ROWS}), 0)`,
        ]
      : [`| STATS ${countColumn} = COUNT(*), ${rawGroupsColumn} = COUNT(*)`];

  const esql = [
    'SET unmapped_fields="nullify";',
    `FROM ${patterns.join(', ')}${metadata}`,
    `| WHERE ${predicates.join('\n    AND ')}`,
    `| STATS BY ${groupingFields.map(quoteIdentifier).join(', ')}`,
    ...tail,
  ].join('\n');

  assertParses(esql);
  return {
    esql,
    params: [{ from: window.from }, { to: window.to }, ...indexParams(plans)],
  };
};

/** Resolves the identity of a definition with `dynamic` and builds its count query over the plans. */
export const generateCountQuery = (
  definition: EntityDefinitionWithoutId,
  plans: QueryPlan[],
  window: TimeWindow
): GeneratedQuery => buildCountQuery({ plans, identity: resolveIdentityPlan(definition), window });
