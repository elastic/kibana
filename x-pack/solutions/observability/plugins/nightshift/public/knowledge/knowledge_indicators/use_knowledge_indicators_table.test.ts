/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import type { Feature } from '@kbn/significant-events-schema';
import type { PromoteResult } from '../../data/rules/use_queries_api';
import {
  useKnowledgeIndicatorsTable,
  getKnowledgeIndicatorTitle,
} from './use_knowledge_indicators_table';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockToasts = {
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addInfo: jest.fn(),
  addError: jest.fn(),
};

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { notifications: { toasts: mockToasts } },
  }),
}));

jest.mock('./use_knowledge_indicators_query_params', () => ({
  useKnowledgeIndicatorsQueryParams: () => ({
    query: {},
    push: mockPush,
    replace: mockReplace,
  }),
}));

let mockKnowledgeIndicators: KnowledgeIndicator[] = [];
let mockIsLoading = false;
const mockRefetch = jest.fn();

jest.mock('../../data/knowledge_indicators/use_fetch_knowledge_indicators', () => ({
  useFetchKnowledgeIndicators: () => ({
    knowledgeIndicators: mockKnowledgeIndicators,
    occurrencesByQueryId: {},
    isLoading: mockIsLoading,
    isEmpty: !mockIsLoading && mockKnowledgeIndicators.length === 0,
    refetch: mockRefetch,
  }),
}));

const mockExcludeFeaturesInBulk = jest.fn();
const mockRestoreFeaturesInBulk = jest.fn();

jest.mock('../../data/knowledge_indicators/use_discovery_features_api', () => ({
  useDiscoveryFeaturesApi: () => ({
    excludeFeaturesInBulk: mockExcludeFeaturesInBulk,
    restoreFeaturesInBulk: mockRestoreFeaturesInBulk,
  }),
}));

const mockPromote = jest.fn();

jest.mock('../../data/rules/use_queries_api', () => ({
  useQueriesApi: () => ({
    promote: mockPromote,
  }),
}));

const mockInvalidatePromoteRelatedQueries = jest.fn().mockResolvedValue(undefined);

jest.mock('../../data/knowledge_indicators/use_invalidate_promote_queries', () => ({
  useInvalidatePromoteRelatedQueries: () => mockInvalidatePromoteRelatedQueries,
}));

const mockDeleteKnowledgeIndicatorsInBulk = jest.fn();

jest.mock('../../data/knowledge_indicators/use_knowledge_indicators_bulk_delete', () => ({
  useKnowledgeIndicatorsBulkDelete: () => ({
    deleteKnowledgeIndicatorsInBulk: mockDeleteKnowledgeIndicatorsInBulk,
    isDeleting: false,
  }),
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

const mockMutate = jest.fn();
let mockMutationCallbacks: {
  onSuccess?: (result: PromoteResult) => Promise<void>;
} = {};

jest.mock('@kbn/react-query', () => ({
  useIsMutating: () => 0,
  useMutation: (config: {
    mutationFn: (ids: string[]) => Promise<unknown>;
    onSuccess?: (result: PromoteResult) => Promise<void>;
  }) => {
    mockMutationCallbacks = { onSuccess: config.onSuccess };
    return {
      mutate: mockMutate,
      isLoading: false,
    };
  },
}));

function makeFeature(
  overrides: Partial<Feature> & { id: string; source_id: string } & Record<string, unknown>
): Feature {
  return {
    type: 'entity',
    title: overrides.title ?? overrides.id,
    subtype: undefined,
    excluded: undefined,
    ...overrides,
  } as unknown as Feature;
}

function makeFeatureKI(
  overrides: Partial<Feature> & { id: string; source_id: string } & Record<string, unknown>
): KnowledgeIndicator {
  return { kind: 'feature', feature: makeFeature(overrides) };
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

describe('getKnowledgeIndicatorTitle', () => {
  it('falls back to feature id when title is missing', () => {
    const ki = makeFeatureKI({ id: 'f1', source_id: 's1', title: undefined });
    expect(getKnowledgeIndicatorTitle(ki)).toBe('f1');
  });

  it('falls back to query id when title is missing', () => {
    const ki = makeQueryKI({ id: 'q1', title: undefined, source_id: 's1' });
    expect(getKnowledgeIndicatorTitle(ki)).toBe('q1');
  });
});

describe('useKnowledgeIndicatorsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKnowledgeIndicators = [];
    mockIsLoading = false;
  });

  describe('filteredKnowledgeIndicators', () => {
    it('sorts alphabetically by title', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ id: 'f2', source_id: 's1', title: 'Zebra' }),
        makeFeatureKI({ id: 'f1', source_id: 's1', title: 'Alpha' }),
        makeQueryKI({ id: 'q1', source_id: 's1', title: 'Middle' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      const titles = result.current.filteredKnowledgeIndicators.map(getKnowledgeIndicatorTitle);
      expect(titles).toEqual(['Alpha', 'Middle', 'Zebra']);
    });
  });

  describe('bulk exclude', () => {
    it('skips when no features are selected (only queries)', async () => {
      const ki = makeQueryKI({ id: 'q1', source_id: 's1' });
      mockKnowledgeIndicators = [ki];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki]);
      });

      await act(async () => {
        await result.current.handleBulkExclude();
      });

      expect(mockExcludeFeaturesInBulk).not.toHaveBeenCalled();
    });
  });

  describe('bulk promote', () => {
    it('calls mutate with unbacked query ids', () => {
      const q1 = makeQueryKI({ id: 'q1', source_id: 's1', backed: false });
      const q2 = makeQueryKI({ id: 'q2', source_id: 's1', backed: true });
      mockKnowledgeIndicators = [q1, q2];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q1, q2]);
      });

      act(() => {
        result.current.handleBulkPromote();
      });

      expect(mockMutate).toHaveBeenCalledWith(['q1']);
    });

    it('skips when no unbacked queries selected', () => {
      const q = makeQueryKI({ id: 'q1', source_id: 's1', backed: true });
      mockKnowledgeIndicators = [q];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q]);
      });

      act(() => {
        result.current.handleBulkPromote();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('promote onSuccess shows toast and invalidates queries', async () => {
      mockKnowledgeIndicators = [];
      renderHook(() => useKnowledgeIndicatorsTable());

      await act(async () => {
        await mockMutationCallbacks.onSuccess?.({
          promoted: 2,
          skipped_stats: 0,
          skipped_ineligible: 0,
        });
      });

      expect(mockToasts.addSuccess).toHaveBeenCalled();
      expect(mockInvalidatePromoteRelatedQueries).toHaveBeenCalled();
    });

    it('reports the skip reason instead of success when nothing was promoted', async () => {
      mockKnowledgeIndicators = [];
      renderHook(() => useKnowledgeIndicatorsTable());

      await act(async () => {
        await mockMutationCallbacks.onSuccess?.({
          promoted: 0,
          skipped_stats: 0,
          skipped_ineligible: 1,
        });
      });

      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
      expect(mockToasts.addInfo).toHaveBeenCalledWith({
        title: expect.stringContaining('filter-only'),
      });
    });

    it('warns about partial success when some queries were skipped', async () => {
      mockKnowledgeIndicators = [];
      renderHook(() => useKnowledgeIndicatorsTable());

      await act(async () => {
        await mockMutationCallbacks.onSuccess?.({
          promoted: 1,
          skipped_stats: 1,
          skipped_ineligible: 0,
        });
      });

      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
      expect(mockToasts.addWarning).toHaveBeenCalledWith({
        title: expect.any(String),
        text: expect.stringContaining('STATS'),
      });
    });
  });

  describe('selection pruning', () => {
    it('prunes selected indicators when they disappear from data', () => {
      const ki1 = makeFeatureKI({ id: 'f1', source_id: 's1' });
      const ki2 = makeFeatureKI({ id: 'f2', source_id: 's1' });
      mockKnowledgeIndicators = [ki1, ki2];

      const { result, rerender } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.setSelectedKnowledgeIndicators([ki1, ki2]);
      });
      expect(result.current.selectedKnowledgeIndicators).toHaveLength(2);

      mockKnowledgeIndicators = [ki1];
      rerender();

      waitFor(() => {
        expect(result.current.selectedKnowledgeIndicators).toHaveLength(1);
      });
    });
  });

  describe('selection computed properties', () => {
    it('selectionContainsNonExcludable is true when queries are selected', () => {
      const q = makeQueryKI({ id: 'q1', source_id: 's1' });
      mockKnowledgeIndicators = [q];

      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      act(() => {
        result.current.setSelectedKnowledgeIndicators([q]);
      });
      expect(result.current.selectionContainsNonExcludable).toBe(true);
    });
  });

  describe('hasOnlyHiddenComputedFeatures', () => {
    it('returns true when all matching indicators are hidden computed features', () => {
      mockKnowledgeIndicators = [
        makeFeatureKI({ id: 'f1', source_id: 's1', type: 'dataset_analysis' }),
      ];
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());
      expect(result.current.filteredKnowledgeIndicators).toHaveLength(0);
      expect(result.current.hasOnlyHiddenComputedFeatures).toBe(true);
    });
  });

  describe('resetPagination', () => {
    it('resets page to 0 when changing filters', () => {
      const { result } = renderHook(() => useKnowledgeIndicatorsTable());

      act(() => {
        result.current.handleTableChange({
          page: { index: 3, size: 25 },
        } as CriteriaWithPagination<KnowledgeIndicator>);
      });
      expect(result.current.pagination.pageIndex).toBe(3);

      act(() => {
        result.current.handleStatusFilterChange('excluded');
      });
      expect(result.current.pagination.pageIndex).toBe(0);
    });
  });
});
