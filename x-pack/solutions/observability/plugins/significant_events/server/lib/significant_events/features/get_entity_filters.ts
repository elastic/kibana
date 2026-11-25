/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureWithFilter } from '@kbn/significant-events-schema';
import { type Condition, isAndCondition, isNotCondition, isOrCondition } from '@kbn/streamlang';
import { isEqual, sumBy } from 'lodash';

// ES|QL rejects an expression with more than 500 left parentheses; a merged filter uses three.
export const MAX_ENTITY_FILTERS = 50;

// Bounds the size of the ES|QL query.
export const MAX_ENTITY_FILTER_VALUES = 1000;

// ES|QL rejects a WHERE nested deeper than 300 levels; negated, a comparison of a compound filter adds two.
export const MAX_ENTITY_FILTER_COMPARISONS = 100;

type EntityValue = string | number | boolean;

export interface EntityValuesFilter {
  field: string;
  values: EntityValue[];
}

export type EntityFilter = EntityValuesFilter | Condition;

export const isEntityValuesFilter = (filter: EntityFilter): filter is EntityValuesFilter =>
  'values' in filter;

const isEqualityFilter = (filter: Condition): filter is { field: string; eq: EntityValue } =>
  Object.keys(filter).length === 2 &&
  'field' in filter &&
  typeof filter.field === 'string' &&
  'eq' in filter &&
  ['string', 'number', 'boolean'].includes(typeof filter.eq);

const countComparisons = (condition: Condition): number => {
  if (isAndCondition(condition)) {
    return sumBy(condition.and, countComparisons);
  }
  if (isOrCondition(condition)) {
    return sumBy(condition.or, countComparisons);
  }
  if (isNotCondition(condition)) {
    return countComparisons(condition.not);
  }
  if ('range' in condition && condition.range) {
    return Math.max(1, Object.keys(condition.range).length);
  }
  return 1;
};

/**
 * Picks the filters of the most recently updated features, merging equality filters on the same field into one.
 */
export const getEntityFilters = (
  features: FeatureWithFilter[],
  maxFilters: number
): { filters: EntityFilter[]; omitted: number } => {
  const sorted = [...features].sort((a, b) =>
    (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
  );

  const filters: EntityFilter[] = [];
  const groups = new Map<string, EntityValuesFilter>();
  let values = 0;
  let comparisons = 0;
  let omitted = 0;

  for (const { filter } of sorted) {
    if (!isEqualityFilter(filter)) {
      if (filters.some((included) => isEqual(included, filter))) {
        continue;
      }
      const cost = countComparisons(filter);
      if (filters.length >= maxFilters || comparisons + cost > MAX_ENTITY_FILTER_COMPARISONS) {
        omitted++;
        continue;
      }
      comparisons += cost;
      filters.push(filter);
      continue;
    }

    const group = groups.get(filter.field);
    if (group?.values.includes(filter.eq)) {
      continue;
    }
    if ((!group && filters.length >= maxFilters) || values >= MAX_ENTITY_FILTER_VALUES) {
      omitted++;
      continue;
    }
    values++;

    if (group) {
      group.values.push(filter.eq);
    } else {
      const created = { field: filter.field, values: [filter.eq] };
      groups.set(filter.field, created);
      filters.push(created);
    }
  }

  return { filters, omitted };
};
