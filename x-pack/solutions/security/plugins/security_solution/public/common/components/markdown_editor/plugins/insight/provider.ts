/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten } from 'lodash';
import type { Filter } from '@kbn/es-query';
import {
  FILTERS,
  isCombinedFilter,
  isRangeFilter,
  isPhraseFilter,
  isPhrasesFilter,
  isExistsFilter,
  BooleanRelation,
} from '@kbn/es-query';
import type { PhraseFilterValue } from '@kbn/es-query/src/filters/build_filters';

export interface Provider {
  field: string;
  excluded: boolean;
  queryType: string;
  value: string | number | boolean;
  valueType?: string;
}

const buildPrimitiveProvider = (filter: Filter): Provider => {
  const field = filter.meta?.key ?? '';
  const excluded = filter.meta?.negate ?? false;
  const queryType = filter.meta?.type ?? FILTERS.PHRASE;
  const baseFilter = {
    field,
    excluded,
    queryType,
  };
  if (isRangeFilter(filter)) {
    const { gte, lt } = filter.query.range[field];
    const value = JSON.stringify({ gte, lt });
    return {
      ...baseFilter,
      value,
      queryType: filter.meta.type ?? FILTERS.RANGE,
    };
  } else if (isPhrasesFilter(filter)) {
    const typeOfParams: PhraseFilterValue = typeof filter.meta?.params[0];
    return {
      ...baseFilter,
      value: JSON.stringify(filter.meta?.params ?? []),
      valueType: typeOfParams,
      queryType: filter.meta.type ?? FILTERS.PHRASES,
    };
  } else if (isExistsFilter(filter)) {
    return {
      ...baseFilter,
      value: '',
      queryType: filter.meta.type ?? FILTERS.EXISTS,
    };
  } else if (isPhraseFilter(filter)) {
    const valueType: PhraseFilterValue = typeof filter.meta?.params?.query;
    return {
      ...baseFilter,
      value: filter.meta?.params?.query ?? '',
      valueType,
      queryType: filter.meta.type ?? FILTERS.PHRASE,
    };
  } else {
    return {
      ...baseFilter,
      value: '',
      queryType: FILTERS.PHRASE,
    };
  }
};

const nonCombinedToProvider = (filters: Filter[]): Provider[] => {
  return filters.map((filter) => {
    return buildPrimitiveProvider(filter);
  });
};

/**
 * This function takes an array of Filter types and returns a 2d array
 * of an intermediate data structure called a Provider, which can map from
 * Filter <-> DataProvider. Items in each inner array of the Provider[][]
 * return value are AND'ed together, items in the outer arrays are OR'ed.
 */
export const filtersToInsightProviders = (filters: Filter[]): Provider[][] => {
  const hasCombined = filters.some(isCombinedFilter);
  if (hasCombined === false) {
    return [nonCombinedToProvider(filters)];
  } else {
    const combinedFilterToProviders: Provider[][] = filters.reduce(
      (outerFilters: Provider[][], filter) => {
        if (isCombinedFilter(filter)) {
          const innerFilters = filter.meta.params;
          if (filter.meta.relation === BooleanRelation.OR) {
            const oredFilters = innerFilters.map((f) => {
              const oredFilter = filtersToInsightProviders([f]);
              return flatten(oredFilter);
            });
            return [...outerFilters, ...oredFilters];
          } else {
            const innerFiltersToProviders = filtersToInsightProviders(innerFilters);
            return [...outerFilters, ...innerFiltersToProviders];
          }
        } else {
          return [...outerFilters, [buildPrimitiveProvider(filter)]];
        }
      },
      []
    );
    return combinedFilterToProviders;
  }
};
