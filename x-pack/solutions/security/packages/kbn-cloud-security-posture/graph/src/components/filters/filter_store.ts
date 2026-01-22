/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Subscription } from 'rxjs';
import type { Filter } from '@kbn/es-query';
import { addFilter, removeFilter, containsFilter } from './search_filters';

/**
 * FilterStore manages filter state for a specific graph instance.
 * Each graph instance (identified by scopeId) gets its own FilterStore.
 * This allows multiple GraphInvestigation components to maintain isolated filter state.
 */
export class FilterStore {
  readonly scopeId: string;
  private readonly dataViewId: string;
  private readonly filters$ = new BehaviorSubject<Filter[]>([]);

  constructor(scopeId: string, dataViewId: string) {
    this.scopeId = scopeId;
    this.dataViewId = dataViewId;
  }

  /**
   * Get the current filters from the store.
   */
  getFilters(): Filter[] {
    return this.filters$.value;
  }

  /**
   * Subscribe to filter changes.
   * @param callback - Function called when filters change
   * @returns Subscription that should be unsubscribed on cleanup
   */
  subscribe(callback: (filters: Filter[]) => void): Subscription {
    return this.filters$.subscribe(callback);
  }

  /**
   * Set the filters in the store directly.
   * Called when SearchBar's onFiltersUpdated fires.
   */
  setFilters(filters: Filter[]): void {
    this.filters$.next(filters);
  }

  /**
   * Toggle a filter on or off.
   * @param field - The field to filter on
   * @param value - The value to filter for
   * @param action - 'show' to add filter, 'hide' to remove
   */
  toggleFilter(field: string, value: string, action: 'show' | 'hide'): void {
    if (action === 'show') {
      const newFilters = addFilter(this.dataViewId, this.filters$.value, field, value);
      this.filters$.next(newFilters);
    } else {
      const newFilters = removeFilter(this.filters$.value, field, value);
      this.filters$.next(newFilters);
    }
  }

  /**
   * Check if a filter with the given field and value is currently active.
   */
  isFilterActive(field: string, value: string): boolean {
    return containsFilter(this.filters$.value, field, value);
  }

  /**
   * Reset the filter store to empty state.
   */
  reset(): void {
    this.filters$.next([]);
  }

  /**
   * Clean up the store by completing the BehaviorSubject.
   * Called when the graph instance unmounts.
   */
  destroy(): void {
    this.filters$.complete();
  }
}

// Registry of FilterStore instances by scopeId
const stores = new Map<string, FilterStore>();

/**
 * Create or get an existing FilterStore for the given scopeId.
 * If a store already exists for this scopeId, returns the existing one.
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param dataViewId - The data view ID used when constructing filters
 * @returns The FilterStore instance for this scopeId
 *
 * @example
 * ```typescript
 * // In a hook or component
 * const store = createFilterStore(scopeId, dataViewId);
 * // Later, clean up on unmount
 * destroyFilterStore(scopeId);
 * ```
 */
export const createFilterStore = (scopeId: string, dataViewId: string): FilterStore => {
  const existing = stores.get(scopeId);
  if (existing) {
    return existing;
  }
  const newStore = new FilterStore(scopeId, dataViewId);
  stores.set(scopeId, newStore);
  return newStore;
};

/**
 * Get an existing FilterStore for the given scopeId.
 * Logs a warning if no store exists for this scopeId.
 *
 * @param scopeId - Unique identifier for the graph instance
 * @returns The FilterStore instance or undefined if not found
 *
 * @example
 * ```typescript
 * const store = getFilterStore(scopeId);
 * if (store) {
 *   const isActive = store.isFilterActive('user.entity.id', 'user-123');
 * }
 * ```
 */
export const getFilterStore = (scopeId: string): FilterStore | undefined => {
  const store = stores.get(scopeId);
  if (!store) {
    // eslint-disable-next-line no-console
    console.warn(
      `[FilterStore] No store found for scopeId: "${scopeId}". ` +
        `Ensure createFilterStore() was called before accessing the store.`
    );
  }
  return store;
};

/**
 * Destroy and remove a FilterStore for the given scopeId.
 * Called when a graph instance unmounts.
 *
 * @param scopeId - Unique identifier for the graph instance
 */
export const destroyFilterStore = (scopeId: string): void => {
  const store = stores.get(scopeId);
  if (store) {
    store.destroy();
    stores.delete(scopeId);
  }
};

/**
 * Reset all stores. Primarily for testing.
 */
export const __resetAllStores = (): void => {
  stores.forEach((store) => store.destroy());
  stores.clear();
};
