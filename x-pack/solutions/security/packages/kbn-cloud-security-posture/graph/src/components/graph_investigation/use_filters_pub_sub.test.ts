/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { useFiltersPubSub } from './use_filters_pub_sub';
import { filterState$, dataViewId$ } from './filter_state';
import { emitFilterAction } from './filter_actions';

describe('useFiltersPubSub', () => {
  const mockSetSearchFilters = jest.fn();
  const testDataViewId = 'test-data-view-id';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset BehaviorSubjects
    filterState$.next([]);
    dataViewId$.next('');
  });

  describe('pushing state to pub-sub', () => {
    it('should push searchFilters to filterState$ on mount and updates', () => {
      const initialFilters: Filter[] = [
        {
          meta: { index: testDataViewId, key: 'field1', params: { query: 'value1' } },
          query: { match_phrase: { field1: 'value1' } },
        },
      ];

      const { rerender } = renderHook(
        ({ filters }) => useFiltersPubSub(filters, mockSetSearchFilters, testDataViewId),
        { initialProps: { filters: initialFilters } }
      );

      // Verify initial state is pushed
      expect(filterState$.getValue()).toEqual(initialFilters);

      // Update filters
      const updatedFilters: Filter[] = [
        ...initialFilters,
        {
          meta: { index: testDataViewId, key: 'field2', params: { query: 'value2' } },
          query: { match_phrase: { field2: 'value2' } },
        },
      ];

      rerender({ filters: updatedFilters });
      expect(filterState$.getValue()).toEqual(updatedFilters);
    });

    it('should push dataViewId to dataViewId$ on mount and updates', () => {
      const { rerender } = renderHook(
        ({ dataViewId }) => useFiltersPubSub([], mockSetSearchFilters, dataViewId),
        { initialProps: { dataViewId: testDataViewId } }
      );

      expect(dataViewId$.getValue()).toBe(testDataViewId);

      // Update dataViewId
      const newDataViewId = 'new-data-view-id';
      rerender({ dataViewId: newDataViewId });
      expect(dataViewId$.getValue()).toBe(newDataViewId);
    });
  });

  describe('subscribing to filter actions', () => {
    it('should call setSearchFilters with addFilter when action is "show"', () => {
      renderHook(() => useFiltersPubSub([], mockSetSearchFilters, testDataViewId));

      act(() => {
        emitFilterAction({
          type: 'TOGGLE_ACTIONS_BY_ENTITY',
          field: 'entity.id',
          value: 'entity-123',
          action: 'show',
        });
      });

      expect(mockSetSearchFilters).toHaveBeenCalled();
      // The setter receives a function, call it with empty array to verify it adds
      const setterFn = mockSetSearchFilters.mock.calls[0][0];
      const result = setterFn([]);
      expect(result).toHaveLength(1);
      expect(result[0].query).toEqual({ match_phrase: { 'entity.id': 'entity-123' } });
    });

    it('should call setSearchFilters with removeFilter when action is "hide"', () => {
      const existingFilters: Filter[] = [
        {
          meta: { index: testDataViewId, key: 'entity.id', params: { query: 'entity-123' } },
          query: { match_phrase: { 'entity.id': 'entity-123' } },
        },
      ];

      renderHook(() => useFiltersPubSub(existingFilters, mockSetSearchFilters, testDataViewId));

      act(() => {
        emitFilterAction({
          type: 'TOGGLE_ACTIONS_BY_ENTITY',
          field: 'entity.id',
          value: 'entity-123',
          action: 'hide',
        });
      });

      expect(mockSetSearchFilters).toHaveBeenCalled();
      // The setter receives a function, call it with existing filters to verify it removes
      const setterFn = mockSetSearchFilters.mock.calls[0][0];
      const result = setterFn(existingFilters);
      expect(result).toHaveLength(0);
    });
  });

  describe('cleanup on unmount', () => {
    it('should reset filterState$ to empty array on unmount', () => {
      const initialFilters: Filter[] = [
        {
          meta: { index: testDataViewId, key: 'field1', params: { query: 'value1' } },
          query: { match_phrase: { field1: 'value1' } },
        },
      ];

      const { unmount } = renderHook(() =>
        useFiltersPubSub(initialFilters, mockSetSearchFilters, testDataViewId)
      );

      // Verify state is set
      expect(filterState$.getValue()).toEqual(initialFilters);
      expect(dataViewId$.getValue()).toBe(testDataViewId);

      // Unmount
      unmount();

      // Verify state is reset
      expect(filterState$.getValue()).toEqual([]);
      expect(dataViewId$.getValue()).toBe('');
    });

    it('should unsubscribe from filterAction$ on unmount', () => {
      const { unmount } = renderHook(() =>
        useFiltersPubSub([], mockSetSearchFilters, testDataViewId)
      );

      unmount();

      // After unmount, emitting actions should not call setSearchFilters
      mockSetSearchFilters.mockClear();

      act(() => {
        emitFilterAction({
          type: 'TOGGLE_ACTIONS_BY_ENTITY',
          field: 'entity.id',
          value: 'entity-123',
          action: 'show',
        });
      });

      expect(mockSetSearchFilters).not.toHaveBeenCalled();
    });
  });
});
