/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import type { OutputColumn } from './columns';
import { LAST_SEEN_COLUMN, buildColumns, planColumnNames } from './columns';
import { quoteIdentifier } from './esql_syntax';
import type { IdentityPlan } from './identity';
import { resolveIdentityPlan } from './identity';
import { assertParses } from './parse_guard';
import type { GeneratedQuery, QueryPlan, TimeWindow } from './types';

/** What {@link buildListQuery} assembles one plan's list query from. */
export interface ListQueryInput {
  plan: QueryPlan;
  identity: IdentityPlan;
  columns: OutputColumn[];
  window: TimeWindow;
  limit: number;
}

const TIMESTAMP = quoteIdentifier('@timestamp');
const CONTINUATION = '\n    ';

const assertValidLimit = (limit: number): void => {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError(`list query limit must be a positive integer, got ${limit}`);
  }
};

// One `LAST ... WHERE ... IS NOT NULL` per attribute column the plan carries, in column order;
// `LAST` does not skip null rows, so the filter is always there.
const attributeAggregations = (columns: OutputColumn[], plan: QueryPlan): string[] =>
  columns.flatMap(({ name, kind, fieldByPlan }) => {
    const field = kind === 'attribute' ? fieldByPlan?.[plan.index] : undefined;
    if (field === undefined) {
      return [];
    }
    const quotedField = quoteIdentifier(field);
    return [
      `${quoteIdentifier(
        name
      )} = LAST(${quotedField}, ${TIMESTAMP}) WHERE ${quotedField} IS NOT NULL`,
    ];
  });

/** Builds the list query of one plan: the newest attributes and `last_seen` per entity in the window. */
export const buildListQuery = ({
  plan,
  identity,
  columns,
  window,
  limit,
}: ListQueryInput): GeneratedQuery => {
  assertValidLimit(limit);
  const { engine, indexPattern, filter } = plan;
  const { groupingFields, presenceFilter, idEvaluation } = identity;

  const predicates = [
    `${TIMESTAMP} >= ?from AND ${TIMESTAMP} < ?to`,
    ...(filter !== undefined ? [`(${filter})`] : []),
    presenceFilter,
  ];
  const aggregations = [
    ...attributeAggregations(columns, plan),
    `${quoteIdentifier(LAST_SEEN_COLUMN)} = MAX(${TIMESTAMP})`,
  ];

  const esql = [
    'SET unmapped_fields="nullify";',
    `${engine} ${indexPattern}`,
    `| WHERE ${predicates.join(`${CONTINUATION}AND `)}`,
    `| STATS ${aggregations.join(`,${CONTINUATION}`)}${CONTINUATION}BY ${groupingFields
      .map(quoteIdentifier)
      .join(', ')}`,
    `| EVAL ${idEvaluation}`,
    `| KEEP ${planColumnNames(columns, plan).map(quoteIdentifier).join(', ')}`,
    `| SORT ${quoteIdentifier(LAST_SEEN_COLUMN)} DESC NULLS LAST`,
    `| LIMIT ${limit}`,
  ].join('\n');

  assertParses(esql);
  return { esql, params: [{ from: window.from }, { to: window.to }] };
};

/** Builds one list query per plan, in plan order, for a definition with `dynamic`. */
export const generateListQueries = (
  definition: EntityDefinitionWithoutId,
  plans: QueryPlan[],
  window: TimeWindow,
  limit: number
): GeneratedQuery[] => {
  assertValidLimit(limit);
  const identity = resolveIdentityPlan(definition);
  const columns = buildColumns(definition, plans, identity);
  return plans.map((plan) => buildListQuery({ plan, identity, columns, window, limit }));
};
