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
import type { GeneratedQuery, QueryPlan, TimeWindow } from './types';

/** The single column the count query returns. */
export const COUNT_COLUMN = 'count';

/** What the count query is built from: the plans, the resolved identity and the window. */
export interface BuildCountQueryInput {
  plans: QueryPlan[];
  identity: IdentityPlan;
  window: TimeWindow;
}

const TIMESTAMP = quoteIdentifier('@timestamp');
const INDEX = quoteIdentifier('_index');

// `_index` holds the concrete index, so each pattern gets two clauses: the first matches a plain
// index, the second the backing indices of a data stream, `.ds-<name>-<yyyy.MM.dd>-<generation>`,
// which a pattern naming the stream, wildcard or not, does not match on its own. The date segment
// keeps a stream name from matching the backing indices of a longer stream (`foo-bar` against
// `foo-bar-baz`). The pattern is placed inside a double-quoted string unescaped: `planSources` has
// validated it against the index pattern character set, which admits neither `"` nor `\`, so it
// cannot close the string or start an escape. Its `*` and `?` carry over as `LIKE` wildcards.
const indexMatches = (indexPattern: string): string =>
  `(${INDEX} LIKE "${indexPattern}" OR ${INDEX} LIKE ".ds-${indexPattern}-????.??.??-*")`;

const planPredicate = ({ indexPattern, filter }: QueryPlan): string =>
  filter === undefined
    ? indexMatches(indexPattern)
    : `(${indexMatches(indexPattern)} AND (${filter}))`;

// With one plan the source already selects its documents, so only its filter remains; with several
// each document must pass the filter of a plan whose pattern matched its index.
const sourcePredicate = (plans: QueryPlan[]): string | undefined => {
  if (plans.length === 1) {
    const [{ filter }] = plans;
    return filter === undefined ? undefined : `(${filter})`;
  }
  return `(${plans.map(planPredicate).join(' OR ')})`;
};

/**
 * Builds the query counting the distinct entities across every plan in the window, as a single
 * `FROM` over the deduplicated patterns, in a column named {@link COUNT_COLUMN}.
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
  const metadata = plans.length > 1 ? ' METADATA _index' : '';
  const predicates = [
    `${TIMESTAMP} >= ?from AND ${TIMESTAMP} < ?to`,
    presenceFilter,
    sourcePredicate(plans),
  ].filter((predicate): predicate is string => predicate !== undefined);
  const countColumn = quoteIdentifier(COUNT_COLUMN);
  // A single field maps groups to ids one to one, so the groups can be counted directly. With
  // several fields two groups can share an id (a ranking falls back to another field, a composition
  // `CONCAT(a, "/", b)` joins `("a/b", "c")` and `("a", "b/c")`), so the ids are grouped again and
  // counted exactly, matching the merged list; `COUNT_DISTINCT` would be approximate.
  const tail =
    groupingFields.length > 1
      ? [
          `| EVAL ${idEvaluation}`,
          `| STATS BY ${quoteIdentifier(ENTITY_ID_COLUMN)}`,
          `| STATS ${countColumn} = COUNT(*)`,
        ]
      : [`| STATS ${countColumn} = COUNT(*)`];

  const esql = [
    'SET unmapped_fields="nullify";',
    `FROM ${patterns.join(', ')}${metadata}`,
    `| WHERE ${predicates.join('\n    AND ')}`,
    `| STATS BY ${groupingFields.map(quoteIdentifier).join(', ')}`,
    ...tail,
  ].join('\n');

  assertParses(esql);
  return { esql, params: [{ from: window.from }, { to: window.to }] };
};

/** Resolves the identity of a definition with `dynamic` and builds its count query over the plans. */
export const generateCountQuery = (
  definition: EntityDefinitionWithoutId,
  plans: QueryPlan[],
  window: TimeWindow
): GeneratedQuery => buildCountQuery({ plans, identity: resolveIdentityPlan(definition), window });
