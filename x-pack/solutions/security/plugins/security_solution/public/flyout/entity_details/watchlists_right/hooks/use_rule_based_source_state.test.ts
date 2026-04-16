/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useRuleBasedSourceState } from './use_rule_based_source_state';
import type { UseRuleBasedSourceStateParams } from './use_rule_based_source_state';
import type { EntitySourceInput } from './rule_based_source_helpers';
import { EMPTY_QUERY } from './rule_based_source_helpers';

const baseParams: UseRuleBasedSourceStateParams = {
  watchlistName: 'Test Watchlist',
  isEditMode: false,
  isManaged: false,
  initialEntitySources: undefined,
  onFieldChange: jest.fn(),
};

const storeSrc: EntitySourceInput = {
  type: 'store',
  name: 'store-1',
  queryRule: 'entity.risk.calculated_level: "High"',
};

const indexSrc: EntitySourceInput = {
  type: 'index',
  name: 'idx-1',
  indexPattern: 'logs-*',
  identifierField: 'host.name',
  queryRule: 'agent.type: "filebeat"',
};

describe('useRuleBasedSourceState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('defaults to entityStore toggle with empty state when no sources provided', () => {
      const { result } = renderHook(() => useRuleBasedSourceState(baseParams));

      expect(result.current.activeToggle).toBe('entityStore');
      expect(result.current.filterQuery).toEqual(EMPTY_QUERY);
      expect(result.current.selectedIndexPatterns).toEqual([]);
      expect(result.current.entityField).toBe('');
      expect(result.current.isEntityStore).toBe(true);
    });

    it('hydrates store source from initialEntitySources', () => {
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          initialEntitySources: [storeSrc],
        })
      );

      expect(result.current.activeToggle).toBe('entityStore');
      expect(result.current.filterQuery.query).toBe('entity.risk.calculated_level: "High"');
    });

    it('hydrates index source and sets toggle to indexPattern', () => {
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          initialEntitySources: [indexSrc],
        })
      );

      expect(result.current.activeToggle).toBe('indexPattern');
      expect(result.current.filterQuery.query).toBe('agent.type: "filebeat"');
      expect(result.current.selectedIndexPatterns).toEqual([{ label: 'logs-*' }]);
      expect(result.current.entityField).toBe('host.name');
    });
  });

  describe('onToggleChange', () => {
    it('switches active toggle', () => {
      const { result } = renderHook(() => useRuleBasedSourceState(baseParams));

      act(() => {
        result.current.onToggleChange('indexPattern');
      });

      expect(result.current.activeToggle).toBe('indexPattern');
      expect(result.current.isEntityStore).toBe(false);
    });

    it('emits sources for non-managed watchlists on toggle', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({ ...baseParams, onFieldChange })
      );

      act(() => {
        result.current.onToggleChange('indexPattern');
      });

      expect(onFieldChange).toHaveBeenCalledWith('entitySources', expect.any(Array));
    });

    it('does NOT emit sources for managed watchlists on toggle alone', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({ ...baseParams, isManaged: true, onFieldChange })
      );

      act(() => {
        result.current.onToggleChange('indexPattern');
      });

      expect(onFieldChange).not.toHaveBeenCalled();
    });
  });

  describe('onQueryChange', () => {
    it('updates the filter query and emits', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({ ...baseParams, onFieldChange })
      );

      act(() => {
        result.current.onQueryChange({ query: 'host.os: "windows"', language: 'kuery' });
      });

      expect(result.current.filterQuery.query).toBe('host.os: "windows"');
      expect(onFieldChange).toHaveBeenCalledWith(
        'entitySources',
        expect.arrayContaining([
          expect.objectContaining({ type: 'store', queryRule: 'host.os: "windows"' }),
        ])
      );
    });
  });

  describe('onIndexPatternsChange', () => {
    it('updates index patterns and marks the index type dirty', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          isManaged: true,
          onFieldChange,
        })
      );

      act(() => {
        result.current.onIndexPatternsChange([{ label: 'metrics-*' }]);
      });

      // Switch to index view to verify
      act(() => {
        result.current.onToggleChange('indexPattern');
      });

      expect(result.current.selectedIndexPatterns).toEqual([{ label: 'metrics-*' }]);

      // Should have emitted for the managed dirty index source
      expect(onFieldChange).toHaveBeenCalledWith(
        'entitySources',
        expect.arrayContaining([
          expect.objectContaining({ type: 'index', indexPattern: 'metrics-*' }),
        ])
      );
    });
  });

  describe('onEntityFieldChange', () => {
    it('updates entity field for index type', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          isManaged: true,
          onFieldChange,
        })
      );

      act(() => {
        result.current.onEntityFieldChange('user.name');
      });

      act(() => {
        result.current.onToggleChange('indexPattern');
      });

      expect(result.current.entityField).toBe('user.name');
    });
  });

  describe('managed watchlist dirty tracking', () => {
    it('only emits store source when only store data is modified', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          isManaged: true,
          onFieldChange,
        })
      );

      act(() => {
        result.current.onQueryChange({ query: 'risk > 50', language: 'kuery' });
      });

      const emittedSources = onFieldChange.mock.calls[0][1];
      expect(emittedSources).toHaveLength(1);
      expect(emittedSources[0].type).toBe('store');
    });

    it('emits both when both types are modified', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          isManaged: true,
          onFieldChange,
        })
      );

      // Modify store
      act(() => {
        result.current.onQueryChange({ query: 'risk > 50', language: 'kuery' });
      });

      // Modify index
      act(() => {
        result.current.onIndexPatternsChange([{ label: 'logs-*' }]);
      });

      // Last call should have both
      const lastCall = onFieldChange.mock.calls[onFieldChange.mock.calls.length - 1];
      expect(lastCall[1]).toHaveLength(2);
      expect(lastCall[1].map((s: EntitySourceInput) => s.type)).toEqual(['store', 'index']);
    });

    it('returns undefined entitySources when nothing is dirty for managed', () => {
      const onFieldChange = jest.fn();
      renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          isManaged: true,
          onFieldChange,
        })
      );

      // No modifications were made, so onFieldChange should not have been called
      expect(onFieldChange).not.toHaveBeenCalled();
    });
  });

  describe('toggleButtons', () => {
    it('has both buttons enabled in create mode', () => {
      const { result } = renderHook(() => useRuleBasedSourceState(baseParams));
      expect(result.current.toggleButtons[0].isDisabled).toBe(false);
      expect(result.current.toggleButtons[1].isDisabled).toBe(false);
    });

    it('has both buttons enabled for managed edit mode', () => {
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          isEditMode: true,
          isManaged: true,
        })
      );
      expect(result.current.toggleButtons[0].isDisabled).toBe(false);
      expect(result.current.toggleButtons[1].isDisabled).toBe(false);
    });

    it('locks non-active toggle for non-managed edit mode with existing store source', () => {
      const { result } = renderHook(() =>
        useRuleBasedSourceState({
          ...baseParams,
          isEditMode: true,
          isManaged: false,
          initialEntitySources: [storeSrc],
        })
      );
      // entityStore should be enabled, indexPattern should be disabled
      expect(result.current.toggleButtons[0].isDisabled).toBe(false);
      expect(result.current.toggleButtons[1].isDisabled).toBe(true);
    });
  });

  describe('hydration', () => {
    it('re-hydrates when initialEntitySources arrive after initial render', () => {
      const { result, rerender } = renderHook(
        (props: UseRuleBasedSourceStateParams) => useRuleBasedSourceState(props),
        { initialProps: baseParams }
      );

      // Initially empty
      expect(result.current.filterQuery).toEqual(EMPTY_QUERY);

      // Simulate async data arriving
      rerender({
        ...baseParams,
        initialEntitySources: [storeSrc],
      });

      expect(result.current.filterQuery.query).toBe('entity.risk.calculated_level: "High"');
    });
  });
});
