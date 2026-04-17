/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject, type Subscription, filter as rxFilter } from 'rxjs';
import type { Filter } from '@kbn/es-query';
import { addFilter, removeFilter, containsFilter } from './search_filters';

// =============================================================================
// Filter Toggle Event Bus
// =============================================================================

/**
 * Event emitted when a filter toggle action is requested.
 * Components emit these events without needing direct FilterStore access.
 * FilterStore instances subscribe and handle events for their scopeId.
 */
export interface FilterToggleEvent {
  type: 'equals';
  scopeId: string;
  field: string;
  value: string;
  action: 'show' | 'hide';
}

export interface IsOneOfFilterToggleEvent {
  type: 'isOneOf';
  scopeId: string;
  field: string;
  values: string[];
  action: 'show' | 'hide';
}

/**
 * Event emitted when an entity relationship toggle action is requested.
 * Components emit these events to expand/collapse entity relationships in the graph.
 * FilterStore instances subscribe and handle events for their scopeId.
 */
export interface EntityRelationshipEvent {
  scopeId: string;
  entityId: string;
  action: 'show' | 'hide';
}

// Global event bus for filter toggle actions
const filterToggleEvents$ = new Subject<FilterToggleEvent | IsOneOfFilterToggleEvent>();

// Global event bus for entity relationship toggle actions
const entityRelationshipEvents$ = new Subject<EntityRelationshipEvent>();

// =============================================================================
// Pinned EUID Event Bus
// =============================================================================

/**
 * Event emitted when a pinned EUID toggle action is requested.
 * When an entity filter is toggled, the entity's EUID is also pinned/unpinned
 * so the server can prioritize it in ES|QL query results.
 */
export interface PinnedEuidEvent {
  scopeId: string;
  entityId: string;
  action: 'show' | 'hide';
}

// Global event bus for pinned EUID toggle actions
const pinnedEuidEvents$ = new Subject<PinnedEuidEvent>();

/**
 * Emit a filter toggle event. Any FilterStore listening for this scopeId
 * will receive the event and update its filter state.
 *
 * This function can be called without having a FilterStore instance.
 * If no store exists for the scopeId, the event is still emitted
 * but no filter state will be updated.
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param field - The field to filter on
 * @param value - The value to filter for
 * @param action - 'show' to add filter, 'hide' to remove
 *
 * @example
 * ```typescript
 * // In a component or hook - no FilterStore needed
 * emitFilterToggle(scopeId, 'user.entity.id', 'user-123', 'show');
 * ```
 */
export const emitFilterToggle = (
  scopeId: string,
  field: string,
  value: string,
  action: 'show' | 'hide'
): void => {
  const event: FilterToggleEvent = { type: 'equals', scopeId, field, value, action };
  filterToggleEvents$.next(event);
};

export const emitIsOneOfFilterToggle = (
  scopeId: string,
  field: string,
  values: string[],
  action: 'show' | 'hide'
): void => {
  const event: IsOneOfFilterToggleEvent = { type: 'isOneOf', scopeId, field, values, action };
  filterToggleEvents$.next(event);
};

/**
 * Emit an entity relationship toggle event. Any FilterStore listening for this scopeId
 * will receive the event and update its expanded entity IDs state.
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param entityId - The entity ID to expand/collapse
 * @param action - 'show' to expand, 'hide' to collapse
 */
export const emitEntityRelationshipToggle = (
  scopeId: string,
  entityId: string,
  action: 'show' | 'hide'
): void => {
  const event: EntityRelationshipEvent = { scopeId, entityId, action };
  entityRelationshipEvents$.next(event);
};

/**
 * Emit a pinned EUID toggle event. Any FilterStore listening for this scopeId
 * will receive the event and update its pinned EUIDs state.
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param entityId - The entity EUID to pin/unpin
 * @param action - 'show' to pin, 'hide' to unpin
 */
export const emitPinnedEuidToggle = (
  scopeId: string,
  entityId: string,
  action: 'show' | 'hide'
): void => {
  const event: PinnedEuidEvent = { scopeId, entityId, action };
  pinnedEuidEvents$.next(event);
};

/**
 * Check if an entity's relationships are expanded for the given scope.
 * Returns false gracefully if no store exists.
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param entityId - The entity ID to check
 * @returns true if the entity's relationships are expanded
 */
export const isEntityRelationshipExpandedForScope = (
  scopeId: string,
  entityId: string
): boolean => {
  const store = stores.get(scopeId);
  return store?.isEntityRelationshipExpanded(entityId) ?? false;
};

export const isInitialEntityForScope = (scopeId: string, entityId: string): boolean => {
  const store = stores.get(scopeId);
  return store?.isInitialEntity(entityId) ?? false;
};

/**
 * Check if an entity EUID is pinned for the given scope.
 * Returns false gracefully if no store exists.
 */
export const isPinnedForScope = (scopeId: string, entityId: string): boolean => {
  const store = stores.get(scopeId);
  return store?.isPinned(entityId) ?? false;
};

/**
 * Check if a filter is active for the given scope, field, and value(s).
 * Returns false gracefully if no store exists (no warning logged).
 *
 * @param scopeId - Unique identifier for the graph instance
 * @param field - The field to check
 * @param value - The value or values to check
 * @returns true if the filter is active, false otherwise (including when no store exists)
 *
 * @example
 * ```typescript
 * // In a component or hook - no FilterStore needed
 * const isActive = isFilterActiveForScope(scopeId, 'user.entity.id', 'user-123');
 * const isActive = isFilterActiveForScope(scopeId, 'event.action', ['login', 'logout']);
 * ```
 */
export const isFilterActiveForScope = (
  scopeId: string,
  field: string,
  value: string | string[]
): boolean => {
  const store = stores.get(scopeId);
  return store?.isFilterActive(field, value) ?? false;
};

// =============================================================================
// FilterStore Class
// =============================================================================

// Registry of FilterStore instances by scopeId (declared early for isFilterActiveForScope)
const stores = new Map<string, FilterStore>();

/**
 * FilterStore manages filter state for a specific graph instance.
 * Each graph instance (identified by scopeId) gets its own FilterStore.
 * This allows multiple GraphInvestigation components to maintain isolated filter state.
 *
 * FilterStore automatically subscribes to filter toggle events for its scopeId
 * and updates filter state accordingly.
 */
export class FilterStore {
  readonly scopeId: string;
  private dataViewId?: string;
  private initialEntityIds: Array<{ id: string; isOrigin: boolean }> = [];
  private readonly filters$ = new BehaviorSubject<Filter[]>([]);
  private readonly expandedEntityIds$ = new BehaviorSubject<Set<string>>(new Set());
  private readonly pinnedEuids$ = new BehaviorSubject<Set<string>>(new Set());
  private readonly filterEventSubscription: Subscription;
  private readonly entityRelationshipEventSubscription: Subscription;
  private readonly pinnedEuidEventSubscription: Subscription;

  constructor(scopeId: string) {
    this.scopeId = scopeId;

    // Subscribe to filter toggle events for this scopeId
    this.filterEventSubscription = filterToggleEvents$
      .pipe(rxFilter((event) => event.scopeId === this.scopeId))
      .subscribe((event) => {
        const value = event.type === 'isOneOf' ? event.values : event.value;
        this.toggleFilter(event.field, value, event.action);
      });

    // Subscribe to entity relationship toggle events for this scopeId
    this.entityRelationshipEventSubscription = entityRelationshipEvents$
      .pipe(rxFilter((event) => event.scopeId === this.scopeId))
      .subscribe((event) => {
        this.toggleEntityRelationship(event.entityId, event.action);
      });

    // Subscribe to pinned EUID toggle events for this scopeId
    this.pinnedEuidEventSubscription = pinnedEuidEvents$
      .pipe(rxFilter((event) => event.scopeId === this.scopeId))
      .subscribe((event) => {
        this.togglePinnedEuid(event.entityId, event.action);
      });
  }

  /**
   * Set the dataViewId used when constructing filters.
   */
  setDataViewId(dataViewId: string): void {
    if (dataViewId) {
      this.dataViewId = dataViewId;
    }
  }

  setInitialEntityIds(initialEntityIds: Array<{ id: string; isOrigin: boolean }>): void {
    this.initialEntityIds = initialEntityIds;
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
   * @param value - The value or values to filter for
   * @param action - 'show' to add filter, 'hide' to remove
   */
  toggleFilter(field: string, value: string | string[], action: 'show' | 'hide'): void {
    if (action === 'show') {
      const newFilters = addFilter(this.dataViewId ?? '', this.filters$.value, field, value);
      this.filters$.next(newFilters);
    } else {
      const newFilters = removeFilter(this.filters$.value, field, value);
      this.filters$.next(newFilters);
    }
  }

  /**
   * Check if a filter with the given field and value(s) is currently active.
   */
  isFilterActive(field: string, value: string | string[]): boolean {
    return containsFilter(this.filters$.value, field, value);
  }

  // ===========================================================================
  // Entity Relationship State
  // ===========================================================================

  /**
   * Toggle an entity's relationship expansion state.
   * @param entityId - The entity ID to expand/collapse
   * @param action - 'show' to expand, 'hide' to collapse
   */
  toggleEntityRelationship(entityId: string, action: 'show' | 'hide'): void {
    const next = new Set(this.expandedEntityIds$.value);
    if (action === 'show') {
      next.add(entityId);
    } else {
      next.delete(entityId);
    }
    this.expandedEntityIds$.next(next);
  }

  /**
   * Check if an entity's relationships are currently expanded.
   */
  isEntityRelationshipExpanded(entityId: string): boolean {
    return this.expandedEntityIds$.value.has(entityId) || this.isInitialEntity(entityId);
  }

  /**
   * Check if an entity ID is part of the initial set of entities (e.g. from the original graph request).
   */
  isInitialEntity(entityId: string): boolean {
    return this.initialEntityIds.find((entity) => entity.id === entityId)?.isOrigin ?? false;
  }

  /**
   * Get the current set of expanded entity IDs.
   */
  getExpandedEntityIds(): Set<string> {
    return this.expandedEntityIds$.value;
  }

  /**
   * Subscribe to expanded entity IDs changes.
   * @param callback - Function called when expanded entity IDs change
   * @returns Subscription that should be unsubscribed on cleanup
   */
  subscribeToExpandedEntityIds(callback: (expandedEntityIds: Set<string>) => void): Subscription {
    return this.expandedEntityIds$.subscribe(callback);
  }

  // ===========================================================================
  // Pinned EUID State
  // ===========================================================================

  /**
   * Toggle an entity EUID's pinned state.
   * Pinned EUIDs are sent to the server to prioritize matching events in query results.
   * @param entityId - The entity EUID to pin/unpin
   * @param action - 'show' to pin, 'hide' to unpin
   */
  togglePinnedEuid(entityId: string, action: 'show' | 'hide'): void {
    const next = new Set(this.pinnedEuids$.value);
    if (action === 'show') {
      next.add(entityId);
    } else {
      next.delete(entityId);
    }
    this.pinnedEuids$.next(next);
  }

  /**
   * Check if an entity EUID is currently pinned.
   */
  isPinned(entityId: string): boolean {
    return this.pinnedEuids$.value.has(entityId);
  }

  /**
   * Get the current set of pinned EUIDs.
   */
  getPinnedEuids(): Set<string> {
    return this.pinnedEuids$.value;
  }

  /**
   * Subscribe to pinned EUID changes.
   * @param callback - Function called when pinned EUIDs change
   * @returns Subscription that should be unsubscribed on cleanup
   */
  subscribeToPinnedEuids(callback: (pinnedEuids: Set<string>) => void): Subscription {
    return this.pinnedEuids$.subscribe(callback);
  }

  /**
   * Reset the filter store to empty state.
   */
  reset(): void {
    this.filters$.next([]);
    this.expandedEntityIds$.next(new Set());
    this.pinnedEuids$.next(new Set());
  }

  /**
   * Clean up the store by completing the BehaviorSubjects and unsubscribing from events.
   * Called when the graph instance unmounts.
   */
  destroy(): void {
    this.filterEventSubscription.unsubscribe();
    this.entityRelationshipEventSubscription.unsubscribe();
    this.pinnedEuidEventSubscription.unsubscribe();
    this.filters$.complete();
    this.expandedEntityIds$.complete();
    this.pinnedEuids$.complete();
  }
}

// =============================================================================
// Registry Functions
// =============================================================================

/**
 * Get an existing FilterStore or create a new one for the given scopeId.
 *
 * @param scopeId - Unique identifier for the graph instance
 * @returns The FilterStore instance for this scopeId
 *
 * @example
 * ```typescript
 * // In a hook or component
 * const store = getOrCreateFilterStore(scopeId);
 * store.setDataViewId(dataViewId);
 * // Later, clean up on unmount
 * destroyFilterStore(scopeId);
 * ```
 */
export const getOrCreateFilterStore = (scopeId: string): FilterStore => {
  const existing = stores.get(scopeId);
  if (existing) {
    return existing;
  }
  const newStore = new FilterStore(scopeId);
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
        `Ensure getOrCreateFilterStore() was called before accessing the store.`
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
