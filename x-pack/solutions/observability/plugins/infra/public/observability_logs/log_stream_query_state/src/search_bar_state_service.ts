/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterManager, QueryStringContract } from '@kbn/data-plugin/public';
import { map } from 'rxjs';
import type { InvokeCreator } from 'xstate';
import type { LogStreamQueryContext, LogStreamQueryEvent } from './types';

export const subscribeToQuerySearchBarChanges =
  ({
    queryStringService,
  }: {
    queryStringService: QueryStringContract;
  }): InvokeCreator<LogStreamQueryContext, LogStreamQueryEvent> =>
  (context) =>
    queryStringService.getUpdates$().pipe(
      map(() => queryStringService.getQuery()),
      map((query): LogStreamQueryEvent => {
        return {
          type: 'QUERY_FROM_SEARCH_BAR_CHANGED',
          query,
        };
      })
    );

export const updateQueryInSearchBar =
  ({ queryStringService }: { queryStringService: QueryStringContract }) =>
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if ('query' in context) {
      queryStringService.setQuery(context.query);
    }
  };

export const subscribeToFilterSearchBarChanges =
  ({
    filterManagerService,
  }: {
    filterManagerService: FilterManager;
  }): InvokeCreator<LogStreamQueryContext, LogStreamQueryEvent> =>
  (context) =>
    filterManagerService.getUpdates$().pipe(
      map(() => filterManagerService.getFilters()),
      map((filters): LogStreamQueryEvent => {
        return {
          type: 'FILTERS_FROM_SEARCH_BAR_CHANGED',
          filters,
        };
      })
    );

export const updateFiltersInSearchBar =
  ({ filterManagerService }: { filterManagerService: FilterManager }) =>
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if ('filters' in context) {
      filterManagerService.setFilters(context.filters);
    }
  };
