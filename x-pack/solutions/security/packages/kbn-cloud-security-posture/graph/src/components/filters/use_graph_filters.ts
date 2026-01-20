/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Filter } from '@kbn/es-query';
import { filterAction$ } from './filter_pub_sub';
import {
  getFilters,
  addFilterToStore,
  removeFilterFromStore,
  setFiltersInStore,
  resetFiltersStore,
} from './filter_state';

/**
 * Hook that manages graph filter state and subscribes to filter actions.
 *
 * This hook:
 * 1. Subscribes to filterAction$ to receive filter mutations from action buttons/popovers
 * 2. Mutates the module-level filter store (source of truth)
 * 3. Triggers re-render so GraphInvestigation gets updated searchFilters
 * 4. Provides setSearchFilters for SearchBar's onFiltersUpdated callback
 * 5. Cleans up and resets store on unmount
 *
 * @param dataViewId - The data view ID used when constructing new filters
 * @returns Object containing searchFilters and setSearchFilters
 */
export const useGraphFilters = (
  dataViewId: string
): { searchFilters: Filter[]; setSearchFilters: (filters: Filter[]) => void } => {
  // Force update mechanism - we don't need the state value, just the re-render trigger
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Use ref to access latest dataViewId in subscription without re-subscribing
  const dataViewIdRef = useRef(dataViewId);
  dataViewIdRef.current = dataViewId;

  useEffect(() => {
    const subscription = filterAction$.subscribe(({ field, value, action }) => {
      // Mutate the store (source of truth)
      if (action === 'show') {
        addFilterToStore(dataViewIdRef.current, field, value);
      } else {
        removeFilterFromStore(field, value);
      }
      // Trigger re-render so GraphInvestigation gets updated filters
      forceUpdate();
    });

    return () => {
      subscription.unsubscribe();
      resetFiltersStore();
    };
  }, []);

  // Callback for SearchBar's onFiltersUpdated - sets filters directly in store
  const setSearchFilters = useCallback((filters: Filter[]) => {
    setFiltersInStore(filters);
    forceUpdate();
  }, []);

  // Read from store on every render
  return { searchFilters: getFilters(), setSearchFilters };
};
