/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import type { AttributeSelections } from './attribute_filters';
import { buildAttributePredicate } from './attribute_filters';
import type { OutputColumn } from './columns';
import { LAST_SEEN_COLUMN, buildColumns, fieldOfColumn } from './columns';
import { quoteIdentifier } from './esql_syntax';
import type { IdentityPlan } from './identity';
import { resolveIdentityPlan } from './identity';
import { assertParses } from './parse_guard';
import { CONTINUATION, INDEX_MODE, TIMESTAMP } from './constants';
import { assertValidLimit, sourceCommandOf } from './utils';
import type { GeneratedQuery, NamedParams, QueryPlan, TimeWindow } from './types';

/** The column the query returns: the distinct values of the attribute, as text. */
export const ATTRIBUTE_VALUE_COLUMN = 'value';

/** What {@link buildAttributeValuesQuery} assembles one plan's values query from. */
export interface AttributeValuesQueryInput {
  plan: QueryPlan;
  identity: IdentityPlan;
  columns: OutputColumn[];
  /** The attribute whose values are listed. */
  attribute: string;
  /** The other dropdowns' selections. */
  selections: AttributeSelections;
  window: TimeWindow;
  limit: number;
}

const VALUE = quoteIdentifier(ATTRIBUTE_VALUE_COLUMN);
const LAST_SEEN = quoteIdentifier(LAST_SEEN_COLUMN);

// The steps that read the grouped raw values as the labels the response shows: the raw values the
// author maps become their label, any other value stays as it is, and values of one label group
// again. A multi-value field is already one row per element after the first grouping, and the
// mapping runs on those single values: `==` on a multi-value input is null, so mapping before the
// grouping would leave such a field unmapped. The mapping runs before the sort and the limit, so
// both see the labels.
const labelSteps = (
  valueLabels?: Record<string, string>
): { steps: string[]; params: NamedParams } => {
  const entries = Object.entries(valueLabels ?? {});
  if (entries.length === 0) {
    return { steps: [], params: [] };
  }
  const cases = entries.flatMap((_, index) => [`${VALUE} == ?lk${index}`, `?lv${index}`]);
  return {
    steps: [
      `| EVAL ${VALUE} = CASE(${cases.join(', ')}, ${VALUE})`,
      `| STATS ${LAST_SEEN} = MAX(${LAST_SEEN}) BY ${VALUE}`,
    ],
    params: entries.flatMap(([key, label], index) => [
      { [`lk${index}`]: key },
      { [`lv${index}`]: label },
    ]),
  };
};

/**
 * Builds the query listing the distinct values of an attribute in one plan, among the documents
 * that belong to the type and pass the selections. Returns `undefined` when the plan cannot
 * contribute: its source declares no field for the attribute, or it cannot match the selections.
 */
export const buildAttributeValuesQuery = ({
  plan,
  identity,
  columns,
  attribute,
  selections,
  window,
  limit,
}: AttributeValuesQueryInput): GeneratedQuery | undefined => {
  assertValidLimit(limit, 'attribute values query');
  const field = fieldOfColumn(columns, attribute, plan);
  const attributePredicate = buildAttributePredicate(plan, columns, selections);
  if (field === undefined || attributePredicate === undefined) {
    return undefined;
  }

  const { engine, filter } = plan;
  const labelled = labelSteps(plan.attributes.find(({ name }) => name === attribute)?.valueLabels);
  const predicates = [
    ...(engine === 'FROM' ? [`${INDEX_MODE} != "time_series"`] : []),
    `${TIMESTAMP} >= ?from AND ${TIMESTAMP} < ?to`,
    ...(filter !== undefined ? [`(${filter})`] : []),
    identity.presenceFilter,
    ...(attributePredicate.predicate !== undefined ? [attributePredicate.predicate] : []),
  ];

  // The aggregation keeps the query valid under `TS`, which needs one beside `BY`.
  const esql = [
    'SET unmapped_fields="nullify";',
    sourceCommandOf(plan),
    `| WHERE ${predicates.join(`${CONTINUATION}AND `)}`,
    `| STATS ${LAST_SEEN} = MAX(${TIMESTAMP}) BY ${VALUE} = TO_STRING(${quoteIdentifier(field)})`,
    ...labelled.steps,
    `| WHERE ${VALUE} IS NOT NULL`,
    `| KEEP ${VALUE}, ${LAST_SEEN}`,
    `| SORT ${VALUE} ASC`,
    `| LIMIT ${limit}`,
  ].join('\n');

  assertParses(esql);
  return {
    esql,
    params: [
      { from: window.from },
      { to: window.to },
      ...attributePredicate.params,
      ...labelled.params,
    ],
  };
};

/** What {@link generateAttributeValuesQueries} adds to the plans. */
export interface AttributeValuesRequest {
  attribute: string;
  selections: AttributeSelections;
  window: TimeWindow;
  limit: number;
}

/**
 * Builds the values query of every plan, in plan order, with `undefined` for a plan that cannot
 * contribute (see {@link buildAttributeValuesQuery}).
 */
export const generateAttributeValuesQueries = (
  definition: EntityDefinitionWithoutId,
  plans: QueryPlan[],
  { attribute, selections, window, limit }: AttributeValuesRequest
): Array<GeneratedQuery | undefined> => {
  assertValidLimit(limit, 'attribute values query');
  const identity = resolveIdentityPlan(definition);
  const columns = buildColumns(definition, plans, identity);
  return plans.map((plan) =>
    buildAttributeValuesQuery({ plan, identity, columns, attribute, selections, window, limit })
  );
};
