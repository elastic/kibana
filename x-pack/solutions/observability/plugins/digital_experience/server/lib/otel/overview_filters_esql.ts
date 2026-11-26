/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { partitionFilterValues } from '../../../common/filter_values';
import {
  OVERVIEW_FILTER_NAMES,
  URL_FILTER_NAMES,
  isFreeTextFilter,
  type OverviewFilterName,
  type OverviewFilters,
} from '../../../common/overview_filters';
import { cleanedValue } from '../esql';
import { FIELD_VALUE_LABELS, FILTER_SOURCE_FIELDS } from './overview_filters';

// The ES|QL form of the Overview's filters (`overview_filters.ts`), which match the same
// documents: ES|QL can't read the runtime fields the searches coalesce the alternatives into.

/** The column an `EVAL` coalesces a filter's alternatives into, e.g. `filter_browser`. */
const filterColumnOf = (name: OverviewFilterName): string =>
  `filter_${name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`;

/** A field's value as the filter reads it: in other words when its values have labels. */
const labeledValue = (field: string): string => {
  const labels = FIELD_VALUE_LABELS[field];
  if (!labels) {
    return cleanedValue(field);
  }
  const cases = Object.entries(labels).flatMap(([value, label]) => [
    `TO_STRING(${field}) == ${escapeStringValue(value)}`,
    escapeStringValue(label),
  ]);
  return `CASE(${cases.join(', ')}, null)`;
};

/** The first value of the filter's fields, like the runtime field of the searches. */
const filterValueOf = (name: OverviewFilterName): string => {
  const fields = FILTER_SOURCE_FIELDS[name];
  return fields.length > 1 ? filterColumnOf(name) : fields[0];
};

/** `value` as a `LIKE` pattern's literal text: `*`, `?` and `\` match themselves. */
const escapeLikePattern = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

/** Whether `column` contains `text`, whatever its case. */
const containsCondition = (column: string, text: string): string =>
  `TO_LOWER(${column}) LIKE ${escapeStringValue(`*${escapeLikePattern(text.toLowerCase())}*`)}`;

/** Any of `conditions`, as one condition. */
const anyOf = (conditions: string[]): string =>
  conditions.length === 1 ? conditions[0] : `(${conditions.join(' OR ')})`;

/**
 * The conditions of one filter: any included value and none of the excluded. A document without
 * the field has none of the excluded values, as the searches' `must_not` keeps it too.
 */
const filterConditions = (name: OverviewFilterName, filters: OverviewFilters): string[] => {
  const { include, exclude } = partitionFilterValues(filters[name] ?? []);
  const column = filterValueOf(name);
  const matching = (values: string[]): string =>
    isFreeTextFilter(name)
      ? anyOf(values.map((text) => containsCondition(column, text)))
      : `${column} IN (${values.map(escapeStringValue).join(', ')})`;
  return [
    ...(include.length > 0 ? [matching(include)] : []),
    ...(exclude.length > 0 ? [`(${column} IS NULL OR NOT ${matching(exclude)})`] : []),
  ];
};

/**
 * The filters that narrow the logs only: the HTTP request spans carry the URL they request, not
 * the route of the page they were sent from.
 */
const LOG_FILTER_NAMES = ['pageUrl'] as const satisfies readonly OverviewFilterName[];

const isUrlFilter = (name: OverviewFilterName): boolean =>
  URL_FILTER_NAMES.some((url) => url === name);

const isLogFilter = (name: OverviewFilterName): boolean =>
  LOG_FILTER_NAMES.some((log) => log === name);

const isSelected = (name: OverviewFilterName, filters: OverviewFilters): boolean =>
  (filters[name] ?? []).length > 0;

/**
 * The `EVAL` expressions of the selected filters that read more than one field, e.g.
 * `filter_browser = COALESCE(...)`. Run it before the conditions read the columns.
 */
export const esqlFilterEvals = (filters: OverviewFilters): string[] =>
  OVERVIEW_FILTER_NAMES.filter(
    (name) => isSelected(name, filters) && FILTER_SOURCE_FIELDS[name].length > 1
  ).map(
    (name) =>
      `${filterColumnOf(name)} = COALESCE(${FILTER_SOURCE_FIELDS[name]
        .map(labeledValue)
        .join(', ')})`
  );

/**
 * The selected filters that narrow every document, spans included, as `WHERE` conditions; the page
 * and the URL text aside.
 */
export const esqlDocumentConditions = (filters: OverviewFilters): string[] =>
  OVERVIEW_FILTER_NAMES.filter((name) => !isUrlFilter(name) && !isLogFilter(name)).flatMap((name) =>
    filterConditions(name, filters)
  );

/** The selected page filter, which narrows the logs only, as `WHERE` conditions. */
export const esqlLogConditions = (filters: OverviewFilters): string[] =>
  LOG_FILTER_NAMES.flatMap((name) => filterConditions(name, filters));

/** The selected filters on the URL text, which narrow the page loads only, as `WHERE` conditions. */
export const esqlPageLoadConditions = (filters: OverviewFilters): string[] =>
  URL_FILTER_NAMES.flatMap((name) => filterConditions(name, filters));
