/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BooleanRelation,
  FilterStateStore,
  isCombinedFilter,
  buildCombinedFilter,
  buildPhrasesFilter,
  isPhrasesFilter,
  isFilter,
} from '@kbn/es-query';
import type { Filter, PhraseFilter, PhrasesFilter } from '@kbn/es-query';
import type {
  CombinedFilter,
  PhraseFilterMetaParams,
  PhraseFilterValue,
} from '@kbn/es-query/src/filters/build_filters';

export const CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER = 'graph-investigation';

const buildSinglePhraseFilter = (
  field: string,
  value: string,
  dataViewId?: string
): PhraseFilter => ({
  meta: {
    key: field,
    index: dataViewId,
    negate: false,
    disabled: false,
    type: 'phrase',
    field,
    controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
    params: {
      query: value,
    },
  },
  query: {
    match_phrase: {
      [field]: value,
    },
  },
});

const buildMultiPhrasesFilter = (
  field: string,
  values: string[],
  dataViewId?: string
): PhrasesFilter => {
  const base = buildPhrasesFilter({ name: field, type: 'string' }, values, {
    id: dataViewId,
    title: field,
  });
  return {
    ...base,
    meta: {
      ...base.meta,
      key: field,
      field,
      index: dataViewId,
      negate: false,
      disabled: false,
      controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
    },
  };
};

/**
 * Builds a phrase filter for a single value or a phrases filter for multiple values.
 * When given an array with a single item, falls back to a single phrase filter.
 */
const buildPhraseFilter = (
  field: string,
  value: string | string[],
  dataViewId?: string
): PhraseFilter | PhrasesFilter => {
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return buildSinglePhraseFilter(field, value[0], dataViewId);
    }
    return buildMultiPhrasesFilter(field, value, dataViewId);
  }
  return buildSinglePhraseFilter(field, value, dataViewId);
};

const filterHasKeyAndValue = (filter: Filter, key: string, value: string): boolean => {
  if (isCombinedFilter(filter)) {
    return filter.meta.params.some((param) => filterHasKeyAndValue(param, key, value));
  }

  if (filter.meta.key !== key) {
    return false;
  }

  if (isPhrasesFilter(filter)) {
    return (filter.meta.params as PhraseFilterValue[]).includes(value);
  }

  return (filter.meta.params as PhraseFilterMetaParams)?.query === value;
};

/**
 * Returns true when a single filter matches the given key and contains ALL of the requested values.
 * For a PhrasesFilter the params array must be a superset of `values`.
 * For a CombinedFilter each value must be satisfied by at least one nested filter.
 */
const filterHasKeyAndValues = (filter: Filter, key: string, values: string[]): boolean => {
  if (isCombinedFilter(filter)) {
    return values.every((v) =>
      filter.meta.params.some((param) => filterHasKeyAndValue(param, key, v))
    );
  }

  if (filter.meta.key !== key) {
    return false;
  }

  if (isPhrasesFilter(filter)) {
    const params = filter.meta.params as PhraseFilterValue[];
    return values.every((v) => params.includes(v));
  }

  return false;
};

/**
 * Determines whether the provided filters contain a filter with the provided key and value(s).
 * When `value` is an array of more than one item, it looks for a PhrasesFilter (or CombinedFilter)
 * that covers **all** of the supplied values.
 *
 * @param filters - The list of filters to check.
 * @param key - The key to check for.
 * @param value - The value or values to check for.
 * @returns true if the filters do contain the filter, false if they don't.
 */
export const containsFilter = (
  filters: Filter[],
  key: string,
  value: string | string[]
): boolean => {
  const activeFilters = filters.filter((filter) => !filter.meta.disabled);

  if (Array.isArray(value) && value.length > 1) {
    return activeFilters.some((filter) => filterHasKeyAndValues(filter, key, value));
  }

  const singleValue = Array.isArray(value) ? value[0] : value;
  return activeFilters.some((filter) => filterHasKeyAndValue(filter, key, singleValue));
};

/**
 * Adds a filter to the existing list of filters based on the provided key and value.
 * It will always use the first filter in the list to build a combined filter with the new filter.
 *
 * @param dataViewId - The ID of the data view to which the filter belongs.
 * @param prev - The previous list of filters.
 * @param key - The key for the filter.
 * @param value - The value for the filter.
 * @returns A new list of filters with the added filter.
 */
export const addFilter = (
  dataViewId: string,
  prev: Filter[],
  key: string,
  value: string | string[]
) => {
  const [firstFilter, ...otherFilters] = prev;

  if (
    isCombinedFilter(firstFilter) &&
    !firstFilter?.meta?.disabled &&
    firstFilter?.meta?.relation === BooleanRelation.OR
  ) {
    return [
      {
        ...firstFilter,
        meta: {
          ...firstFilter.meta,
          controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
          params: [
            ...(Array.isArray(firstFilter.meta.params) ? firstFilter.meta.params : []),
            buildPhraseFilter(key, value, dataViewId),
          ],
        },
      },
      ...otherFilters,
    ];
  } else if (
    isFilter(firstFilter) &&
    !firstFilter?.meta?.disabled &&
    firstFilter.meta?.type !== 'custom'
  ) {
    const combinedFilter = buildCombinedFilter(
      BooleanRelation.OR,
      [firstFilter, buildPhraseFilter(key, value, dataViewId)],
      {
        id: dataViewId,
      }
    );
    return [
      {
        ...combinedFilter,
        meta: {
          ...combinedFilter.meta,
          controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
        },
      },
      ...otherFilters,
    ];
  } else {
    // When the first filter is disabled or a custom filter, we just add the new filter to the list.
    return [
      {
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        ...buildPhraseFilter(key, value, dataViewId),
      },
      ...prev,
    ];
  }
};

const removeFilterFromCombinedFilter = (filter: CombinedFilter, key: string, value: string) => {
  const newCombinedFilter = {
    ...filter,
    meta: {
      ...filter.meta,
      params: filter.meta.params.filter(
        (param: Filter) => !filterHasKeyAndValue(param, key, value)
      ),
    },
  };

  if (newCombinedFilter.meta.params.length === 1) {
    return newCombinedFilter.meta.params[0];
  } else if (newCombinedFilter.meta.params.length === 0) {
    return null;
  } else {
    return newCombinedFilter;
  }
};

export const removeFilter = (filters: Filter[], key: string, value: string | string[]) => {
  if (Array.isArray(value) && value.length > 1) {
    // For multi-value removal we look for a top-level filter that satisfies all values.
    // If that filter is a CombinedFilter, we try to strip matching nested entries from it
    // (e.g. a PhrasesFilter nested inside). If the top-level filter itself is not a
    // CombinedFilter (e.g. a standalone PhrasesFilter), we remove it outright.
    const topFilter = filters.find((f) => filterHasKeyAndValues(f, key, value));

    if (!topFilter) {
      return filters;
    }

    if (isCombinedFilter(topFilter)) {
      // Check whether any individual nested entry covers all values on its own (e.g. PhrasesFilter).
      // If so, strip those entries from the combined filter.
      const hasNestedMatch = topFilter.meta.params.some((param) =>
        filterHasKeyAndValues(param, key, value)
      );

      if (hasNestedMatch) {
        const newParams = topFilter.meta.params.filter(
          (param: Filter) => !filterHasKeyAndValues(param, key, value)
        );

        if (newParams.length === 0) {
          return filters.filter((f) => f !== topFilter);
        } else if (newParams.length === 1) {
          return filters.map((f) => (f === topFilter ? newParams[0] : f));
        } else {
          return filters.map((f) =>
            f === topFilter ? { ...topFilter, meta: { ...topFilter.meta, params: newParams } } : f
          );
        }
      }

      // The CombinedFilter satisfies the values only collectively (no single nested entry
      // covers all of them on its own). Remove the entire CombinedFilter.
      return filters.filter((f) => f !== topFilter);
    }

    // Standalone filter (e.g. PhrasesFilter) — remove it outright.
    return filters.filter((f) => f !== topFilter);
  }

  const singleValue = Array.isArray(value) ? value[0] : value;
  const matchedFilter = filters.filter((filter) => filterHasKeyAndValue(filter, key, singleValue));

  if (matchedFilter.length > 0 && isCombinedFilter(matchedFilter[0])) {
    const newCombinedFilter = removeFilterFromCombinedFilter(matchedFilter[0], key, singleValue);

    if (!newCombinedFilter) {
      return filters.filter((filter) => filter !== matchedFilter[0]);
    }

    return filters.map((filter) => (filter === matchedFilter[0] ? newCombinedFilter : filter));
  } else if (matchedFilter.length > 0) {
    return filters.filter((filter) => filter !== matchedFilter[0]);
  }

  return filters;
};

/**
 * Helper function to extract filter value(s) from a single filter.
 * Handles both simple phrase filters and combined filters recursively.
 */
const getFilterValue = (
  filter: Filter,
  keys: string[]
): PhraseFilterValue[] | PhraseFilterValue | null => {
  if (isCombinedFilter(filter)) {
    return filter.meta.params
      .map((param) => getFilterValue(param, keys))
      .filter((value): value is PhraseFilterValue | PhraseFilterValue[] => value !== null)
      .flat();
  }

  if (!filter.meta.key || !keys.includes(filter.meta.key)) {
    return null;
  }

  if (isPhrasesFilter(filter)) {
    return filter.meta.params as PhraseFilterValue[];
  }

  return (filter.meta.params as PhraseFilterMetaParams)?.query ?? null;
};
