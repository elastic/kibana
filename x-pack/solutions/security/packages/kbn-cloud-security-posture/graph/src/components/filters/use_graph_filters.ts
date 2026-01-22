/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Filter } from '@kbn/es-query';
import { createFilterStore, destroyFilterStore } from './filter_state';

/**
 * Hook that manages graph filter state for a specific scope.
 *
 * This hook:
 * 1. Creates or retrieves a FilterStore for the given scopeId
 * 2. Subscribes to filter changes from the store
 * 3. Triggers re-render when filters change (from action buttons or SearchBar)
 * 4. Provides setSearchFilters for SearchBar's onFiltersUpdated callback
 * 5. Cleans up and destroys the store on unmount
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param dataViewId - The data view ID used when constructing new filters
 * @returns Object containing searchFilters and setSearchFilters
 */
export const useGraphFilters = (
  scopeId: string,
  dataViewId: string
): { searchFilters: Filter[]; setSearchFilters: (filters: Filter[]) => void } => {
  // Force update mechanism - we don't need the state value, just the re-render trigger
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Create or get the FilterStore for this scopeId
  const storeRef = useRef(createFilterStore(scopeId, dataViewId));

  useEffect(() => {
    // Subscribe to filter changes from the store
    const subscription = storeRef.current.subscribe(() => {
      // Trigger re-render so GraphInvestigation gets updated filters
      forceUpdate();
    });

    return () => {
      subscription.unsubscribe();
      destroyFilterStore(scopeId);
    };
  }, [scopeId]);

  // Callback for SearchBar's onFiltersUpdated - sets filters directly in store
  const setSearchFilters = useCallback((filters: Filter[]) => {
    storeRef.current.setFilters(filters);
  }, []);

  // Read from store on every render
  return { searchFilters: storeRef.current.getFilters(), setSearchFilters };
};
