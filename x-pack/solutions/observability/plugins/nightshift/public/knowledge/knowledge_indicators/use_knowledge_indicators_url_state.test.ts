/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook as renderHookWithWrapper, act, waitFor } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import type { AggregatedFeature } from '@kbn/significant-events-schema';
import { useKnowledgeIndicatorsUrlState } from './use_knowledge_indicators_url_state';

let mockQuery: Record<string, string | string[]> = {};
let history = createMemoryHistory();

const renderHook = (callback: () => ReturnType<typeof useKnowledgeIndicatorsUrlState>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(mockQuery)) {
    for (const entry of Array.isArray(value) ? value : [value]) params.append(key, entry);
  }
  history = createMemoryHistory({
    initialEntries: [`/knowledge/knowledge_indicators?${params.toString()}`],
  });
  return renderHookWithWrapper(callback, {
    wrapper: ({ children }) => React.createElement(Router, { history }, children),
  });
};

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

function makeFeatureKI(
  overrides: Partial<AggregatedFeature> & { uuid: string; source_id: string } & Record<
      string,
      unknown
    >
): KnowledgeIndicator {
  return {
    kind: 'feature',
    feature: {
      type: 'entity',
      id: overrides.uuid,
      title: overrides.title ?? overrides.uuid,
      subtype: undefined,
      excluded_at: undefined,
      sources: [overrides.source_id],
      instances: [{ source_id: overrides.source_id, uuid: overrides.uuid, confidence: 0 }],
      ...overrides,
    } as unknown as AggregatedFeature,
  };
}

function makeQueryKI(opts: {
  id: string;
  title?: string;
  source_id: string;
  backed?: boolean;
  type?: string;
}): KnowledgeIndicator {
  return {
    kind: 'query',
    query: {
      id: opts.id,
      title: opts.title ?? opts.id,
      type: opts.type ?? 'match',
    },
    rule: { backed: opts.backed ?? false, id: opts.id },
    source_id: opts.source_id,
  } as KnowledgeIndicator;
}

const defaultParams = {
  knowledgeIndicators: [] as KnowledgeIndicator[],
  isLoading: false,
  resetPagination: jest.fn(),
  clearSelection: jest.fn(),
};

describe('useKnowledgeIndicatorsUrlState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = {};
  });

  describe('initial state from URL query params', () => {
    it('returns empty defaults when no query params', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));

      expect(result.current.tableSearchValue).toBe('');
      expect(result.current.statusFilter).toBe('active');
      expect(result.current.selectedTypes).toEqual([]);
      expect(result.current.selectedSubtypes).toEqual([]);
      expect(result.current.selectedStreams).toEqual([]);
      expect(result.current.hideComputedTypes).toBe(true);
    });

    it('initializes search from query.search', () => {
      mockQuery = { search: 'hello' };
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(result.current.tableSearchValue).toBe('hello');
    });

    it('initializes status from query.status', () => {
      mockQuery = { status: 'excluded' };
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(result.current.statusFilter).toBe('excluded');
    });

    it('defaults status to active for unknown values', () => {
      mockQuery = { status: 'bogus' };
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(result.current.statusFilter).toBe('active');
    });

    it('initializes type as array from string', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 's1', type: 'entity' })];
      mockQuery = { type: 'entity' };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedTypes).toEqual(['entity']);
    });

    it('initializes type as array from array', () => {
      const knowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', source_id: 's1', type: 'entity' }),
        makeFeatureKI({ uuid: 'f2', source_id: 's1', type: 'infrastructure' }),
      ];
      mockQuery = { type: ['entity', 'infrastructure'] };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedTypes).toEqual(['entity', 'infrastructure']);
    });

    it('initializes subtype from query', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 's1', subtype: 'sub1' })];
      mockQuery = { subtype: 'sub1' };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedSubtypes).toEqual(['sub1']);
    });

    it('initializes the source filter from query', () => {
      const knowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', source_id: 's1' }),
        makeFeatureKI({ uuid: 'f2', source_id: 's2' }),
      ];
      mockQuery = { source: ['s1', 's2'] };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedStreams).toEqual(['s1', 's2']);
    });

    it('uses repeated legacy stream values when source is absent', () => {
      mockQuery = { stream: ['s1', 's2'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(result.current.selectedStreams).toEqual(['s1', 's2']);
      const params = new URLSearchParams(history.location.search);
      expect(params.getAll('source')).toEqual(['s1', 's2']);
      expect(params.has('stream')).toBe(false);
    });

    it('prefers source over legacy stream when both are present', () => {
      mockQuery = { source: ['source-1'], stream: ['legacy-1', 'legacy-2'] };
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(result.current.selectedStreams).toEqual(['source-1']);
      expect(new URLSearchParams(history.location.search).getAll('source')).toEqual(['source-1']);
    });

    it('initializes hideComputedTypes=false when showComputed is true', () => {
      mockQuery = { showComputed: 'true' };
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(result.current.hideComputedTypes).toBe(false);
    });
  });

  describe('selectedKnowledgeIndicator from selectedItem param', () => {
    it('returns null when no selectedItem param', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 's1' })];
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedKnowledgeIndicator).toBeNull();
    });

    it('finds matching feature by uuid', () => {
      const ki = makeFeatureKI({ uuid: 'f1', source_id: 's1' });
      const knowledgeIndicators = [ki];
      mockQuery = { selectedItem: 'f1' };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedKnowledgeIndicator).toBe(ki);
      expect(result.current.selectedKnowledgeIndicatorId).toBe('f1');
    });

    it('finds matching query by id', () => {
      const ki = makeQueryKI({ id: 'q1', source_id: 's1' });
      const knowledgeIndicators = [ki];
      mockQuery = { selectedItem: 'q1' };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedKnowledgeIndicator).toBe(ki);
    });

    it('returns null when selectedItem does not match any indicator', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 's1' })];
      mockQuery = { selectedItem: 'nonexistent' };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedKnowledgeIndicator).toBeNull();
    });
  });

  describe('URL sync effect', () => {
    it('replaces the URL with filter state', () => {
      renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));

      expect(history.action).toBe('REPLACE');
      expect(history.location.pathname).toBe('/knowledge/knowledge_indicators');
      expect(history.location.search).toBe('');
    });

    it('includes all active filters in URL', () => {
      mockQuery = {
        search: 'test',
        status: 'excluded',
        type: ['entity'],
        subtype: ['sub1'],
        source: ['logs'],
        showComputed: 'true',
      };

      renderHook(() => useKnowledgeIndicatorsUrlState({ ...defaultParams, isLoading: true }));

      expect(history.action).toBe('REPLACE');
      const params = new URLSearchParams(history.location.search);
      expect(params.get('search')).toBe('test');
      expect(params.get('status')).toBe('excluded');
      expect(params.getAll('type')).toEqual(['entity']);
      expect(params.getAll('subtype')).toEqual(['sub1']);
      expect(params.getAll('source')).toEqual(['logs']);
      expect(params.get('showComputed')).toBe('true');
    });

    it('preserves selectedItem in URL', () => {
      mockQuery = { selectedItem: 'f1' };
      renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(history.action).toBe('REPLACE');
      expect(new URLSearchParams(history.location.search).get('selectedItem')).toBe('f1');
    });
  });

  describe('flyout navigation', () => {
    it('closeFlyout pushes without selectedItem param', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      act(() => {
        result.current.closeFlyout();
      });
      expect(history.action).toBe('PUSH');
      expect(new URLSearchParams(history.location.search).has('selectedItem')).toBe(false);
    });

    it('toggleSelectedKnowledgeIndicator opens flyout for new item', () => {
      const ki = makeFeatureKI({ uuid: 'f1', source_id: 's1' });
      const knowledgeIndicators = [ki];
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );

      act(() => {
        result.current.toggleSelectedKnowledgeIndicator(ki);
      });
      expect(history.action).toBe('PUSH');
      expect(new URLSearchParams(history.location.search).get('selectedItem')).toBe('f1');
    });

    it('toggleSelectedKnowledgeIndicator closes flyout for already-open item', () => {
      const ki = makeFeatureKI({ uuid: 'f1', source_id: 's1' });
      const knowledgeIndicators = [ki];
      mockQuery = { selectedItem: 'f1' };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );

      act(() => {
        result.current.toggleSelectedKnowledgeIndicator(ki);
      });
      expect(history.action).toBe('PUSH');
      expect(new URLSearchParams(history.location.search).has('selectedItem')).toBe(false);
    });
  });

  describe('handler callbacks', () => {
    it('handleStatusFilterChange updates statusFilter and calls clearSelection', () => {
      const clearSelection = jest.fn();
      const resetPagination = jest.fn();
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, clearSelection, resetPagination })
      );

      act(() => {
        result.current.handleStatusFilterChange('excluded');
      });
      expect(result.current.statusFilter).toBe('excluded');
      expect(clearSelection).toHaveBeenCalled();
      expect(resetPagination).toHaveBeenCalled();
    });

    it('handleSelectedTypesChange updates types and clears subtypes', () => {
      const knowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', source_id: 's1', type: 'entity', subtype: 'sub1' }),
      ];
      mockQuery = { subtype: ['sub1'] };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedSubtypes).toEqual(['sub1']);

      act(() => {
        result.current.handleSelectedTypesChange(['entity']);
      });
      expect(result.current.selectedTypes).toEqual(['entity']);
      expect(result.current.selectedSubtypes).toEqual([]);
    });

    it('handleSelectedSubtypesChange updates subtypes', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      act(() => {
        result.current.handleSelectedSubtypesChange(['sub1', 'sub2']);
      });
      expect(result.current.selectedSubtypes).toEqual(['sub1', 'sub2']);
    });

    it('handleSelectedStreamsChange updates streams', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 'logs' })];
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      act(() => {
        result.current.handleSelectedStreamsChange(['logs']);
      });
      expect(result.current.selectedStreams).toEqual(['logs']);
    });

    it('handleComputedToggleChange toggles computed types', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      expect(result.current.hideComputedTypes).toBe(true);

      act(() => {
        result.current.handleComputedToggleChange(true);
      });
      expect(result.current.hideComputedTypes).toBe(false);

      act(() => {
        result.current.handleComputedToggleChange(false);
      });
      expect(result.current.hideComputedTypes).toBe(true);
    });

    it('handleComputedToggleChange removes computed types from selectedTypes when hiding', () => {
      const knowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', source_id: 's1', type: 'entity' }),
        makeFeatureKI({ uuid: 'f2', source_id: 's1', type: 'dataset_analysis' }),
      ];
      mockQuery = { type: ['entity', 'dataset_analysis'], showComputed: 'true' };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      expect(result.current.selectedTypes).toEqual(['entity', 'dataset_analysis']);

      act(() => {
        result.current.handleComputedToggleChange(false);
      });
      expect(result.current.hideComputedTypes).toBe(true);
      expect(result.current.selectedTypes).toEqual(['entity']);
    });

    it('handleSearchChange updates search value', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsUrlState(defaultParams));
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'test' },
        } as React.ChangeEvent<HTMLInputElement>);
      });
      expect(result.current.tableSearchValue).toBe('test');
    });
  });

  describe('filter pruning effect', () => {
    it('does not prune while loading', () => {
      mockQuery = { type: ['nonexistent'] };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, isLoading: true })
      );
      expect(result.current.selectedTypes).toEqual(['nonexistent']);
    });

    it('prunes type filters that no longer match any indicator', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 's1', type: 'entity' })];
      mockQuery = { type: ['entity', 'nonexistent'] };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      waitFor(() => {
        expect(result.current.selectedTypes).toEqual(['entity']);
      });
    });

    it('preserves stream filters from URL when no indicators exist for that stream yet', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 'logs' })];
      mockQuery = { source: ['logs', 'metrics'] };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );
      waitFor(() => {
        expect(result.current.selectedStreams).toEqual(['logs', 'metrics']);
      });
    });

    it('prunes stream filters that no longer match any indicator and were not in the initial URL', () => {
      const knowledgeIndicators = [makeFeatureKI({ uuid: 'f1', source_id: 'logs' })];
      mockQuery = { source: ['logs'] };
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );

      act(() => {
        result.current.handleSelectedStreamsChange(['logs', 'metrics']);
      });

      waitFor(() => {
        expect(result.current.selectedStreams).toEqual(['logs']);
      });
    });

    it('keeps a stream filter matched only by a non-representative source', async () => {
      const knowledgeIndicators = [
        makeFeatureKI({ uuid: 'f1', source_id: 'logs', sources: ['logs', 'metrics'] }),
      ];
      const { result } = renderHook(() =>
        useKnowledgeIndicatorsUrlState({ ...defaultParams, knowledgeIndicators })
      );

      act(() => {
        result.current.handleSelectedStreamsChange(['metrics', 'traces']);
      });

      await waitFor(() => {
        expect(result.current.selectedStreams).toEqual(['metrics']);
      });
    });
  });
});
