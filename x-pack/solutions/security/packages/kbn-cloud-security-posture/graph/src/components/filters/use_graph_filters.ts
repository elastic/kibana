/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Filter } from '@kbn/es-query';
import { createFilterStore, destroyFilterStore } from './filter_store';

/**
 * Hook that manages graph filter state for a specific scope.
 *
 * This hook:
 * 1. Creates or retrieves a FilterStore for the given scopeId
 * 2. Subscribes to filter changes from the store using useSyncExternalStore
 * 3. Automatically re-renders when filters change (from action buttons or SearchBar)
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
  // Create or get the FilterStore for this scopeId
  const store = useMemo(() => createFilterStore(scopeId, dataViewId), [scopeId, dataViewId]);

  // Clean up store on unmount or when scopeId changes
  useEffect(() => {
    return () => {
      destroyFilterStore(scopeId);
    };
  }, [scopeId]);

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const subscription = store.subscribe(onStoreChange);
      return () => subscription.unsubscribe();
    },
    [store]
  );

  // Snapshot function for useSyncExternalStore
  const getSnapshot = useCallback(() => store.getFilters(), [store]);

  // Use React 18's useSyncExternalStore for optimal concurrent rendering support
  const searchFilters = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Callback for SearchBar's onFiltersUpdated - sets filters directly in store
  const setSearchFilters = useCallback(
    (filters: Filter[]) => {
      store.setFilters(filters);
    },
    [store]
  );

  return { searchFilters, setSearchFilters };
};
