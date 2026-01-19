/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { useEffect, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { containsFilter } from './search_filters';

/**
 * BehaviorSubject holding the current search filters state.
 * GraphInvestigation pushes filter state changes to this Subject.
 * Flyout components subscribe to read the current filter state for UI rendering.
 *
 * Flow: GraphInvestigation (searchFilters change) → filterState$ → Flyout (useFilterState hook)
 *
 * This is READ-ONLY for flyout components - they should never call .next() directly.
 * Use emitFilterAction() from filter_actions.ts to trigger filter changes.
 */
export const filterState$ = new BehaviorSubject<Filter[]>([]);

/**
 * BehaviorSubject holding the current dataViewId.
 * Required for constructing filters with the correct index reference.
 */
export const dataViewId$ = new BehaviorSubject<string>('');

/**
 * Updates the filter state. Called by GraphInvestigation when searchFilters change.
 * This is the ONLY place that should update filterState$.
 *
 * @param filters - The current search filters array
 */
export const pushFilterState = (filters: Filter[]): void => {
  filterState$.next(filters);
};

/**
 * Updates the dataViewId state. Called by GraphInvestigation when dataViewId changes.
 *
 * @param id - The current dataViewId
 */
export const pushDataViewId = (id: string): void => {
  dataViewId$.next(id);
};

/**
 * React hook to subscribe to filter state changes.
 * Returns the current filters and provides utility for checking filter states.
 *
 * @returns Object containing current filters and utility functions
 */
export const useFilterState = (): {
  filters: Filter[];
  dataViewId: string;
  isFilterActive: (field: string, value: string) => boolean;
} => {
  const [filters, setFilters] = useState<Filter[]>(filterState$.getValue());
  const [dataViewId, setDataViewId] = useState<string>(dataViewId$.getValue());

  useEffect(() => {
    const filterSub = filterState$.subscribe(setFilters);
    const dataViewSub = dataViewId$.subscribe(setDataViewId);

    return () => {
      filterSub.unsubscribe();
      dataViewSub.unsubscribe();
    };
  }, []);

  return {
    filters,
    dataViewId,
    /**
     * Check if a filter with the given field and value is currently active (not disabled).
     */
    isFilterActive: (field: string, value: string) => containsFilter(filters, field, value),
  };
};

/**
 * Reset filter state (primarily for tests).
 */
export const __resetFilterState = (): void => {
  filterState$.next([]);
  dataViewId$.next('');
};
