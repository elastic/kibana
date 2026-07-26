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
    it('defaults to none toggle with empty state when no sources provided', () => {
      const { result } = renderHook(() => useRuleBasedSourceState(baseParams));

      expect(result.current.activeToggle).toBe('none');
      expect(result.current.isNone).toBe(true);
      expect(result.current.isEntityStore).toBe(false);
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

    it('emits entity sources for managed watchlists on toggle', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({ ...baseParams, isManaged: true, onFieldChange })
      );

      act(() => {
        result.current.onToggleChange('indexPattern');
      });

      // Managed path emits undefined when no sources are dirty
      expect(onFieldChange).toHaveBeenCalledWith('entitySources', undefined);
    });
  });

  describe('onQueryChange', () => {
    it('updates the filter query and emits', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({ ...baseParams, onFieldChange })
      );

      // Switch to entityStore first (default is 'none' which has no source type)
      act(() => {
        result.current.onToggleChange('entityStore');
      });
      onFieldChange.mockClear();

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

  describe('onRangeChange', () => {
    it('updates the range and emits for index source', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() =>
        useRuleBasedSourceState({ ...baseParams, onFieldChange })
      );

      // Switch to index pattern so range is included in the emitted source
      act(() => {
        result.current.onToggleChange('indexPattern');
      });
      onFieldChange.mockClear();

      act(() => {
        result.current.onRangeChange({ start: 'now-7d', end: 'now' });
      });

      expect(result.current.range).toEqual({ start: 'now-7d', end: 'now' });
      expect(onFieldChange).toHaveBeenCalledWith(
        'entitySources',
        expect.arrayContaining([
          expect.objectContaining({ range: { start: 'now-7d', end: 'now' } }),
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

      // Switch to entityStore first (default is 'none')
      act(() => {
        result.current.onToggleChange('entityStore');
      });
      onFieldChange.mockClear();

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

      // Switch to entityStore first to modify store
      act(() => {
        result.current.onToggleChange('entityStore');
      });

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
    it('returns three buttons: none, entityStore, indexPattern', () => {
      const { result } = renderHook(() => useRuleBasedSourceState(baseParams));
      expect(result.current.toggleButtons).toHaveLength(3);
      expect(result.current.toggleButtons[0].id).toBe('none');
      expect(result.current.toggleButtons[1].id).toBe('entityStore');
      expect(result.current.toggleButtons[2].id).toBe('indexPattern');
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
