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
import type { Feature } from '@kbn/significant-events-schema';
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
  overrides: Partial<Feature> & { uuid: string; source_id: string } & Record<string, unknown>
): KnowledgeIndicator {
  return {
    kind: 'feature',
    feature: {
      type: 'entity',
      id: overrides.uuid,
      title: overrides.title ?? overrides.uuid,
      subtype: undefined,
      excluded_at: undefined,
      ...overrides,
    } as unknown as Feature,
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
  });

  describe('URL sync effect', () => {
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
  });

  describe('flyout navigation', () => {
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
  });
});
