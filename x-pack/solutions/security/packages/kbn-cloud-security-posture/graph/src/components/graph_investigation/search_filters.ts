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
  isFilter,
} from '@kbn/es-query';
import type { Filter, PhraseFilter } from '@kbn/es-query';
import type { PhraseFilterMetaParams } from '@kbn/es-query/src/filters/build_filters';

export const CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER = 'graph-investigation';

const buildPhraseFilter = (field: string, value: string, dataViewId?: string): PhraseFilter => ({
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

const filterHasKeyAndValue = (filter: Filter, key: string, value: string) => {
  return filter.meta.key === key && (filter.meta.params as PhraseFilterMetaParams)?.query === value;
};

/**
 * Determines whether the provided filters contain a filter with the provided key and value.
 *
 * @param filters - The list of filters to check.
 * @param key - The key to check for.
 * @param value - The value to check for.
 * @returns true if the filters do contain the filter, false if they don't.
 */
export const containsFilter = (filters: Filter[], key: string, value: string): boolean => {
  const controlledFilter = filters.find(
    (filter) => filter.meta.controlledBy === CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
  );

  if (!controlledFilter) {
    return filters.some((filter) => filterHasKeyAndValue(filter, key, value));
  }

  if (isCombinedFilter(controlledFilter)) {
    return controlledFilter.meta.params.some((param) => filterHasKeyAndValue(param, key, value));
  }

  return filterHasKeyAndValue(controlledFilter, key, value);
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
export const addFilter = (dataViewId: string, prev: Filter[], key: string, value: string) => {
  const [firstFilter, ...otherFilters] = prev;

  if (isCombinedFilter(firstFilter) && firstFilter?.meta?.relation === BooleanRelation.OR) {
    return [
      {
        ...firstFilter,
        meta: {
          ...firstFilter.meta,
          controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
          params: [
            ...(Array.isArray(firstFilter.meta.params) ? firstFilter.meta.params : []),
            buildPhraseFilter(key, value),
          ],
        },
      },
      ...otherFilters,
    ];
  } else if (isFilter(firstFilter) && firstFilter.meta?.type !== 'custom') {
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

export const removeFilter = (filters: Filter[], key: string, value: string) => {
  const controlledFilter = filters.find(
    (filter) => filter.meta.controlledBy === CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
  );

  if (!controlledFilter) {
    return filters.filter((filter) => !filterHasKeyAndValue(filter, key, value));
  }

  if (isCombinedFilter(controlledFilter)) {
    const filteredControlledFilter = {
      ...controlledFilter,
      meta: {
        ...controlledFilter.meta,
        params: controlledFilter.meta.params.filter(
          (param) => !filterHasKeyAndValue(param, key, value)
        ),
      },
    };

    if (filteredControlledFilter.meta.params.length === 0) {
      return filters.filter((filter) => filter !== controlledFilter);
    }

    return [filteredControlledFilter, ...filters.filter((filter) => filter !== controlledFilter)];
  }

  if (filterHasKeyAndValue(controlledFilter, key, value)) {
    return filters.filter((filter) => filter !== controlledFilter);
  }

  return filters;
};
