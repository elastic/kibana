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
import { ENTITY_ID_COLUMN, resolveIdentityPlan } from './identity';
import { assertParses } from './parse_guard';
import { CONTINUATION, INDEX_MODE, TIMESTAMP } from './constants';
import { assertValidLimit, sourceCommandOf } from './utils';
import type { GeneratedQuery, QueryPlan, TimeWindow } from './types';

/** What {@link buildListQuery} assembles one plan's list query from. */
export interface ListQueryInput {
  plan: QueryPlan;
  identity: IdentityPlan;
  columns: OutputColumn[];
  window: TimeWindow;
  limit: number;
}

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
  assertValidLimit(limit, 'list query');
  const { engine, filter } = plan;
  const { groupingFields, presenceFilter, idEvaluation, rawIdentityColumns } = identity;

  // One source becomes two plans that together read every index behind the pattern exactly once.
  // Both name the pattern as the author wrote it, so Elasticsearch applies index privileges, alias
  // filters and routing itself; naming an alias's backing indices would bypass its filter, and no
  // metadata call is needed to learn them.
  // - `TS <pattern>` resolves only `index.mode: time_series` indices and silently skips the rest.
  //   It is built only when the probe found a readable time-series index (see probe_query.ts),
  //   because over a pattern with none `TS ... | STATS` fails verification.
  // - `FROM <pattern> METADATA _index_mode | WHERE _index_mode != "time_series"` reads the rest.
  //   `_index_mode` is per-index metadata (`standard`, `time_series`, `logsdb`, `lookup`), so the
  //   predicate is resolved at planning and time-series shards are never opened; verified with the
  //   query profile, not documented. `METADATA` takes the name bare: Elasticsearch rejects a quoted
  //   one there.
  // Under `unmapped_fields="nullify"` a field mapped in no index a plan reads comes back as a column
  // of type `null`; the executor reads readability and availability from that (plan_result.ts).
  const sourceCommand = sourceCommandOf(plan);
  const predicates = [
    ...(engine === 'FROM' ? [`${INDEX_MODE} != "time_series"`] : []),
    `${TIMESTAMP} >= ?from AND ${TIMESTAMP} < ?to`,
    ...(filter !== undefined ? [`(${filter})`] : []),
    presenceFilter,
  ];
  // The id evaluation assigns `entity.id`, so an identity on `entity.id` would lose its grouped
  // column, and with it the `null` type that says no index maps the field: the evaluation types it
  // `keyword` even then. Each such field is copied first, in the same `EVAL`, into a raw column
  // kept after the output columns; a copy of a `null`-typed column is itself typed `null`. Both
  // observed on 9.6, under `FROM` and `TS`.
  const rawAssignments = [...rawIdentityColumns].map(
    ([field, column]) => `${quoteIdentifier(column)} = ${quoteIdentifier(field)}`
  );
  const aggregations = [
    ...attributeAggregations(columns, plan),
    `${quoteIdentifier(LAST_SEEN_COLUMN)} = MAX(${TIMESTAMP})`,
  ];

  const esql = [
    'SET unmapped_fields="nullify";',
    sourceCommand,
    `| WHERE ${predicates.join(`${CONTINUATION}AND `)}`,
    `| STATS ${aggregations.join(`,${CONTINUATION}`)}${CONTINUATION}BY ${groupingFields
      .map(quoteIdentifier)
      .join(', ')}`,
    `| EVAL ${[...rawAssignments, idEvaluation].join(', ')}`,
    `| KEEP ${[...planColumnNames(columns, plan), ...rawIdentityColumns.values()]
      .map(quoteIdentifier)
      .join(', ')}`,
    // Ties broken on `entity.id`, the merge's tie key too, so a cut plan returns a deterministic set.
    `| SORT ${quoteIdentifier(LAST_SEEN_COLUMN)} DESC NULLS LAST, ${quoteIdentifier(
      ENTITY_ID_COLUMN
    )} ASC`,
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
  assertValidLimit(limit, 'list query');
  const identity = resolveIdentityPlan(definition);
  const columns = buildColumns(definition, plans, identity);
  return plans.map((plan) => buildListQuery({ plan, identity, columns, window, limit }));
};
