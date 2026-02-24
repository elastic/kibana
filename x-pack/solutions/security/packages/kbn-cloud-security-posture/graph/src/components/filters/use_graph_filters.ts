/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Filter } from '@kbn/es-query';
import {
  getOrCreateFilterStore,
  destroyFilterStore,
  emitEntityRelationshipToggle,
} from './filter_store';
import type { NodeProps } from '../types';

/**
 * Hook that manages graph filter state for a specific scope.
 *
 * This hook:
 * 1. Creates or retrieves a FilterStore for the given scopeId
 * 2. Subscribes to filter changes from the store using useSyncExternalStore
 * 3. Subscribes to expanded entity IDs from the store using useSyncExternalStore
 * 4. Automatically re-renders when filters or entity relationships change
 * 5. Provides setSearchFilters for SearchBar's onFiltersUpdated callback
 * 6. Provides onToggleEntityRelationships for entity relationship toggle
 * 7. Computes entityIdsForApi from expandedEntityIds for graph data fetching
 * 8. Cleans up and destroys the store on unmount
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param dataViewId - The data view ID used when constructing new filters
 * @returns Object containing searchFilters, setSearchFilters, expandedEntityIds, onToggleEntityRelationships, entityIdsForApi
 */
export const useGraphFilters = (
  scopeId: string,
  dataViewId: string
): {
  searchFilters: Filter[];
  setSearchFilters: (filters: Filter[]) => void;
  expandedEntityIds: Set<string>;
  onToggleEntityRelationships: (node: NodeProps, action: 'show' | 'hide') => void;
  entityIdsForApi: Array<{ id: string; isOrigin: boolean }> | undefined;
} => {
  // Get or create the FilterStore for this scopeId
  const store = useMemo(() => getOrCreateFilterStore(scopeId), [scopeId]);

  // Update dataViewId when it changes
  useEffect(() => {
    store.setDataViewId(dataViewId);
  }, [store, dataViewId]);

  // Clean up store on unmount or when scopeId changes
  useEffect(() => {
    return () => {
      destroyFilterStore(scopeId);
    };
  }, [scopeId]);

  // Subscribe function for useSyncExternalStore (filters)
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const subscription = store.subscribe(onStoreChange);
      return () => subscription.unsubscribe();
    },
    [store]
  );

  // Snapshot function for useSyncExternalStore (filters)
  const getSnapshot = useCallback(() => store.getFilters(), [store]);

  // Use React 18's useSyncExternalStore for optimal concurrent rendering support
  const searchFilters = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Subscribe function for useSyncExternalStore (expanded entity IDs)
  const subscribeToExpandedEntityIds = useCallback(
    (onStoreChange: () => void) => {
      const subscription = store.subscribeToExpandedEntityIds(onStoreChange);
      return () => subscription.unsubscribe();
    },
    [store]
  );

  // Snapshot function for useSyncExternalStore (expanded entity IDs)
  const getExpandedEntityIdsSnapshot = useCallback(() => store.getExpandedEntityIds(), [store]);

  const expandedEntityIds = useSyncExternalStore(
    subscribeToExpandedEntityIds,
    getExpandedEntityIdsSnapshot,
    getExpandedEntityIdsSnapshot
  );

  // Callback for SearchBar's onFiltersUpdated - sets filters directly in store
  const setSearchFilters = useCallback(
    (filters: Filter[]) => {
      store.setFilters(filters);
    },
    [store]
  );

  // Toggle handler for entity relationships - emits event to event bus
  const onToggleEntityRelationships = useCallback(
    (node: NodeProps, action: 'show' | 'hide') => {
      emitEntityRelationshipToggle(scopeId, node.id, action);
    },
    [scopeId]
  );

  // Convert expandedEntityIds Set to API format
  const entityIdsForApi = useMemo(() => {
    if (expandedEntityIds.size === 0) return undefined;

    return Array.from(expandedEntityIds).map((id) => ({
      id,
      isOrigin: false, // User-expanded entities are not the graph origin
    }));
  }, [expandedEntityIds]);

  return {
    searchFilters,
    setSearchFilters,
    expandedEntityIds,
    onToggleEntityRelationships,
    entityIdsForApi,
  };
};
