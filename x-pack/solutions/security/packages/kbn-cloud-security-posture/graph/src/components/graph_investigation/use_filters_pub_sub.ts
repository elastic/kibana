/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type React from 'react';
import type { Filter } from '@kbn/es-query';
import { pushFilterState, pushDataViewId } from './filter_state';
import { filterAction$ } from './filter_actions';
import { addFilter, removeFilter } from './search_filters';

/**
 * Hook to manage pub-sub communication between GraphInvestigation and flyout components.
 *
 * This hook:
 * 1. Pushes filter state changes to filterState$ for flyout components to read
 * 2. Pushes dataViewId changes to dataViewId$ for flyout components to construct filters
 * 3. Subscribes to filter actions from flyout components and applies them to searchFilters
 * 4. Cleans up subscriptions and resets state on unmount
 *
 * @param searchFilters - Current search filters state
 * @param setSearchFilters - State setter for search filters
 * @param dataViewId - Current data view ID
 */
export const useFiltersPubSub = (
  searchFilters: Filter[],
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>,
  dataViewId: string
): void => {
  // Push filter state to pub-sub for flyout components to read
  useEffect(() => {
    pushFilterState(searchFilters);
  }, [searchFilters]);

  // Push dataViewId to pub-sub for flyout components to use when constructing filters
  useEffect(() => {
    pushDataViewId(dataViewId);
  }, [dataViewId]);

  // Subscribe to filter actions from flyout components
  useEffect(() => {
    const subscription = filterAction$.subscribe((payload) => {
      const { field, value, action } = payload;
      if (action === 'show') {
        setSearchFilters((prev) => addFilter(dataViewId, prev, field, value));
      } else {
        setSearchFilters((prev) => removeFilter(prev, field, value));
      }
    });

    return () => subscription.unsubscribe();
  }, [dataViewId, setSearchFilters]);

  // Cleanup on unmount - reset BehaviorSubjects to prevent stale state
  useEffect(() => {
    return () => {
      pushFilterState([]);
      pushDataViewId('');
    };
  }, []);
};
