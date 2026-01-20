/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { addFilter, removeFilter, containsFilter } from './search_filters';

/**
 * Module-level store for filter state.
 * This is the single source of truth for filters across all components.
 * Components can read synchronously via isFilterActive() without subscribing.
 */
let currentFilters: Filter[] = [];

/**
 * Get the current filters from the store.
 * Used by useGraphFilters to return the current state.
 */
export const getFilters = (): Filter[] => currentFilters;

/**
 * Add a filter to the store.
 * Called by useGraphFilters when a 'show' action is received.
 *
 * @param dataViewId - The data view ID for constructing the filter
 * @param field - The field to filter on
 * @param value - The value to filter for
 */
export const addFilterToStore = (dataViewId: string, field: string, value: string): void => {
  currentFilters = addFilter(dataViewId, currentFilters, field, value);
};

/**
 * Remove a filter from the store.
 * Called by useGraphFilters when a 'hide' action is received.
 *
 * @param field - The field to remove filter for
 * @param value - The value to remove filter for
 */
export const removeFilterFromStore = (field: string, value: string): void => {
  currentFilters = removeFilter(currentFilters, field, value);
};

/**
 * Check if a filter with the given field and value is currently active.
 * This is a synchronous read from the store - no React subscription needed.
 * Use this in action buttons to determine "Show" vs "Hide" label at render time.
 *
 * @param field - The field to check
 * @param value - The value to check
 * @returns true if the filter is active, false otherwise
 */
export const isFilterActive = (field: string, value: string): boolean => {
  return containsFilter(currentFilters, field, value);
};

/**
 * Set the filters in the store directly.
 * Called by useGraphFilters when SearchBar's onFiltersUpdated fires.
 *
 * @param filters - The new filters array to set
 */
export const setFiltersInStore = (filters: Filter[]): void => {
  currentFilters = filters;
};

/**
 * Reset the filter store to empty state.
 * Called on unmount and for test isolation.
 */
export const resetFiltersStore = (): void => {
  currentFilters = [];
};
