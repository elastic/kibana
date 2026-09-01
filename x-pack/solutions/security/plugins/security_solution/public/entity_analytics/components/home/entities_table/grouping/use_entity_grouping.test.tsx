/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { renderHook } from '@testing-library/react';
import { useGrouping } from '@kbn/grouping';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { useHasEntityResolutionLicense } from '../../../../../common/hooks/use_has_entity_resolution_license';
import { DataViewContext } from '..';
import { ALLOWED_ENTITY_TYPES, ENTITY_FIELDS, ENTITY_GROUPING_OPTIONS } from '../constants';
import type { EntityURLStateResult } from '../hooks/use_entity_url_state';
import { getAggregationsByGroupField, useEntityGrouping } from './use_entity_grouping';
import type { Filter } from '@kbn/es-query';
import {
  useFetchFilteredResolutionGroupData,
  useFetchGroupedData,
  useFetchUnfilteredResolutionGroupData,
} from './use_fetch_grouped_data';

jest.mock('@kbn/grouping', () => ({
  ...jest.requireActual('@kbn/grouping'),
  useGrouping: jest.fn(() => ({
    selectedGroups: [],
    setSelectedGroups: jest.fn(),
    groupsUnit: jest.fn(),
    options: [],
  })),
}));

jest.mock('../../../../../common/hooks/use_has_entity_resolution_license', () => ({
  useHasEntityResolutionLicense: jest.fn(() => false),
}));

jest.mock('./use_fetch_grouped_data', () => ({
  useFetchGroupedData: jest.fn(() => ({ data: undefined, isFetching: false })),
  useFetchUnfilteredResolutionGroupData: jest.fn(() => ({ data: undefined, isFetching: false })),
  useFetchFilteredResolutionGroupData: jest.fn(() => ({ data: undefined, isFetching: false })),
}));

const mockDataView = { fields: [] } as unknown as DataView;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DataViewContext.Provider value={{ dataView: mockDataView, dataViewIsLoading: false }}>
    {children}
  </DataViewContext.Provider>
);

const createMockState = (overrides: Partial<EntityURLStateResult> = {}): EntityURLStateResult =>
  ({
    sort: [['@timestamp', 'desc']],
    query: undefined,
    queryError: undefined,
    pageSize: 25,
    pageIndex: 0,
    setUrlQuery: jest.fn(),
    filters: [],
    getRowsFromPages: jest.fn(() => []),
    onChangeItemsPerPage: jest.fn(),
    onResetFilters: jest.fn(),
    onSort: jest.fn(),
    onChangePage: jest.fn(),
    ...overrides,
  } as EntityURLStateResult);

describe('getAggregationsByGroupField', () => {
  it('returns empty array for none group', () => {
    const result = getAggregationsByGroupField(ENTITY_GROUPING_OPTIONS.NONE);
    expect(result).toEqual([]);
  });

  it('returns cardinality + entityType agg for ENTITY_TYPE', () => {
    const result = getAggregationsByGroupField(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      groupByField: {
        cardinality: { field: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE },
      },
    });
    expect(result[1]).toEqual({
      entityType: {
        terms: { field: ENTITY_FIELDS.ENTITY_TYPE, size: 1 },
      },
    });
  });

  it('returns only cardinality for unknown fields', () => {
    const result = getAggregationsByGroupField('some.unknown.field');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      groupByField: {
        cardinality: { field: 'some.unknown.field' },
      },
    });
  });
});

describe('useEntityGrouping — license gating', () => {
  const mockUseGrouping = useGrouping as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(false);
    mockUseGrouping.mockReturnValue({
      selectedGroups: [],
      setSelectedGroups: jest.fn(),
      groupsUnit: jest.fn(),
      options: [],
    });
  });

  it('excludes Resolution from grouping options when license is inactive', () => {
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(false);
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState(),
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );
    const { defaultGroupingOptions } = mockUseGrouping.mock.calls[0][0];
    expect(defaultGroupingOptions.map((o: { key: string }) => o.key)).not.toContain(
      ENTITY_GROUPING_OPTIONS.RESOLUTION
    );
  });

  it('includes Resolution in grouping options when license is active', () => {
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState(),
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );
    const { defaultGroupingOptions } = mockUseGrouping.mock.calls[0][0];
    expect(defaultGroupingOptions.map((o: { key: string }) => o.key)).toContain(
      ENTITY_GROUPING_OPTIONS.RESOLUTION
    );
  });
});

describe('useEntityGrouping — entity type plain-field query', () => {
  const mockUseGrouping = useGrouping as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(false);
    mockUseGrouping.mockReturnValue({
      selectedGroups: [ENTITY_GROUPING_OPTIONS.ENTITY_TYPE],
      setSelectedGroups: jest.fn(),
      groupsUnit: jest.fn(),
      options: [],
    });
  });

  it('builds a plain terms agg on ENTITY_TYPE field with no runtime_mappings', () => {
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState(),
          selectedGroup: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const { query } = (useFetchGroupedData as jest.Mock).mock.calls[0][0];
    expect(query.runtime_mappings).toBeUndefined();
    expect(query.aggs?.groupByFields?.terms?.field).toBe(ENTITY_FIELDS.ENTITY_TYPE);
    expect(query.aggs?.groupByFields?.terms?.size).toBe(ALLOWED_ENTITY_TYPES.length);
  });

  it('includes entityType size-1 sub-agg inside groupByFields', () => {
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState(),
          selectedGroup: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const { query } = (useFetchGroupedData as jest.Mock).mock.calls[0][0];
    expect(query.aggs?.groupByFields?.aggs?.entityType).toEqual({
      terms: { field: ENTITY_FIELDS.ENTITY_TYPE, size: 1 },
    });
  });

  it('includes nullGroupItems missing agg, unitsCount value_count, and groupsCount cardinality on the plain field', () => {
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState(),
          selectedGroup: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const { query } = (useFetchGroupedData as jest.Mock).mock.calls[0][0];
    expect(query.aggs?.nullGroupItems).toEqual({ missing: { field: ENTITY_FIELDS.ENTITY_TYPE } });
    expect(query.aggs?.unitsCount).toEqual({ value_count: { field: ENTITY_FIELDS.ENTITY_TYPE } });
    expect(query.aggs?.groupsCount).toEqual({ cardinality: { field: ENTITY_FIELDS.ENTITY_TYPE } });
  });

  it('clamps bucket_sort.from to 0 when the requested page offset exceeds the terms-agg window', () => {
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ pageIndex: 2, pageSize: 25 }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const { query } = (useFetchGroupedData as jest.Mock).mock.calls[0][0];
    // offset 2*25=50 is past the allowed-type bucket window, so it clamps to 0.
    expect(query.aggs?.groupByFields?.aggs?.bucket_truncate?.bucket_sort?.from).toBe(0);
    expect(query.aggs?.groupByFields?.aggs?.bucket_truncate?.bucket_sort?.size).toBe(25);
  });

  it('uses the requested bucket_sort.from when it fits within the terms-agg window', () => {
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ pageIndex: 1, pageSize: 2 }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const { query } = (useFetchGroupedData as jest.Mock).mock.calls[0][0];
    // Three allowed types with page size 2 produce pages starting at offsets 0 and 2.
    expect(query.aggs?.groupByFields?.aggs?.bucket_truncate?.bucket_sort?.from).toBe(2);
  });
});

describe('useEntityGrouping — filtered and unfiltered routing', () => {
  const mockUnfilteredResolutionResult = useFetchUnfilteredResolutionGroupData as jest.Mock;
  const mockFilteredResolutionResult = useFetchFilteredResolutionGroupData as jest.Mock;
  const mockUseGrouping = useGrouping as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
    mockUnfilteredResolutionResult.mockReturnValue({ data: undefined, isFetching: false });
    mockFilteredResolutionResult.mockReturnValue({ data: undefined, isFetching: false });
    (useFetchGroupedData as jest.Mock).mockReturnValue({ data: undefined, isFetching: false });
    mockUseGrouping.mockReturnValue({
      selectedGroups: [ENTITY_GROUPING_OPTIONS.RESOLUTION],
      setSelectedGroups: jest.fn(),
      groupsUnit: jest.fn(),
      options: [],
    });
  });

  it('enables unfiltered grouping when state.query is undefined and groupFilters is empty', () => {
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: undefined }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    expect(mockUnfilteredResolutionResult.mock.calls[0][0].enabled).toBe(true);
    expect(mockFilteredResolutionResult.mock.calls[0][0].enabled).toBe(false);
  });

  it('enables unfiltered grouping for a canonical empty state.query bool', () => {
    const emptyBool: ESBoolQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };

    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: emptyBool }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    expect(mockUnfilteredResolutionResult.mock.calls[0][0].enabled).toBe(true);
    expect(mockFilteredResolutionResult.mock.calls[0][0].enabled).toBe(false);
  });

  it('enables filtered grouping when state.query has any active top-level clause', () => {
    const activeQuery: ESBoolQuery = {
      bool: {
        filter: [{ term: { 'host.name': 'my-host' } } as unknown as ESBoolQuery],
        must: [],
        should: [],
        must_not: [],
      },
    };

    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: activeQuery }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    expect(mockUnfilteredResolutionResult.mock.calls[0][0].enabled).toBe(false);
    expect(mockFilteredResolutionResult.mock.calls[0][0].enabled).toBe(true);
  });

  it('enables filtered grouping when groupFilters is non-empty and includes them in the query', () => {
    const groupFilter: Filter = { meta: {}, query: { match_phrase: { 'host.name': 'srv-01' } } };

    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: undefined }),
          groupFilters: [groupFilter],
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    expect(mockUnfilteredResolutionResult.mock.calls[0][0].enabled).toBe(false);
    expect(mockFilteredResolutionResult.mock.calls[0][0].enabled).toBe(true);
    expect(mockFilteredResolutionResult.mock.calls[0][0].filter).toBeDefined();
    expect(JSON.stringify(mockFilteredResolutionResult.mock.calls[0][0].filter)).toContain(
      'srv-01'
    );
  });

  it('passes a single active state.query straight through to filtered grouping', () => {
    const activeQuery: ESBoolQuery = {
      bool: {
        filter: [{ term: { 'host.name': 'my-host' } } as unknown as ESBoolQuery],
        must: [],
        should: [],
        must_not: [],
      },
    };

    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: activeQuery }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    expect(mockFilteredResolutionResult.mock.calls[0][0].filter).toEqual(activeQuery);
  });

  it('does not duplicate a global filter already present in state.query', () => {
    // useBaseEsQuery already folded the active global filter into state.query.
    const stateQueryWithGlobal: ESBoolQuery = {
      bool: {
        must: [],
        filter: [{ term: { 'host.ip': '1.2.3.4' } } as unknown as ESBoolQuery],
        should: [],
        must_not: [],
      },
    };

    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: stateQueryWithGlobal }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    expect(mockFilteredResolutionResult.mock.calls[0][0].filter).toEqual(stateQueryWithGlobal);
  });

  it('wraps state.query and compiled groupFilters into one filtered-grouping query', () => {
    const activeQuery: ESBoolQuery = {
      bool: {
        filter: [{ term: { 'host.name': 'my-host' } } as unknown as ESBoolQuery],
        must: [],
        should: [],
        must_not: [],
      },
    };
    const groupFilter: Filter = { meta: {}, query: { match_phrase: { 'user.name': 'alice' } } };

    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: activeQuery }),
          groupFilters: [groupFilter],
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const { filter } = mockFilteredResolutionResult.mock.calls[0][0];
    expect(filter.bool.filter).toHaveLength(2);
    expect(filter.bool.filter).toContainEqual(activeQuery);
    expect(JSON.stringify(filter.bool.filter)).toContain('alice');
  });
});

describe('useEntityGrouping — filtered resolution data wiring', () => {
  const mockFilteredResolutionResult = useFetchFilteredResolutionGroupData as jest.Mock;
  const mockUseGrouping = useGrouping as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
    (useFetchUnfilteredResolutionGroupData as jest.Mock).mockReturnValue({
      data: undefined,
      isFetching: false,
    });
    (useFetchGroupedData as jest.Mock).mockReturnValue({ data: undefined, isFetching: false });
    mockUseGrouping.mockReturnValue({
      selectedGroups: [ENTITY_GROUPING_OPTIONS.RESOLUTION],
      setSelectedGroups: jest.fn(),
      groupsUnit: jest.fn(),
      options: [],
    });
    mockFilteredResolutionResult.mockReturnValue({
      data: {
        groupData: {
          groupByFields: {
            buckets: [
              {
                key: ['target-x'],
                key_as_string: 'target-x',
                selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
                doc_count: 1,
                resolutionRiskScore: { value: 42 },
              },
            ],
          },
          groupsCount: { value: 9 },
          unitsCount: { value: 20 },
        },
        targetMetadata: new Map(),
      },
      isFetching: false,
    });
  });

  it('forwards filtered resolution data when a user filter is active', () => {
    const activeQuery: ESBoolQuery = {
      bool: {
        filter: [{ term: { 'host.name': 'my-host' } } as unknown as ESBoolQuery],
        must: [],
        should: [],
        must_not: [],
      },
    };

    const { result } = renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: activeQuery }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const groupData = result.current.groupData as unknown as {
      groupByFields: { buckets: Array<Record<string, unknown>> };
      groupsCount: { value: number };
      unitsCount: { value: number };
    };

    expect(groupData.groupByFields.buckets[0].key).toEqual(['target-x']);
    expect(groupData.groupByFields.buckets[0].resolutionRiskScore).toEqual({ value: 42 });
    expect(groupData.groupsCount.value).toBe(9);
    expect(groupData.unitsCount.value).toBe(20);
  });
});

describe('useEntityGrouping — synthesized resolution bucket shape', () => {
  const mockUnfilteredResolutionResult = useFetchUnfilteredResolutionGroupData as jest.Mock;
  const mockUseGrouping = useGrouping as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
    (useFetchFilteredResolutionGroupData as jest.Mock).mockReturnValue({
      data: undefined,
      isFetching: false,
    });
    (useFetchGroupedData as jest.Mock).mockReturnValue({ data: undefined, isFetching: false });
    mockUseGrouping.mockReturnValue({
      selectedGroups: [ENTITY_GROUPING_OPTIONS.RESOLUTION],
      setSelectedGroups: jest.fn(),
      groupsUnit: jest.fn(),
      options: [],
    });
    mockUnfilteredResolutionResult.mockReturnValue({
      data: {
        groupData: {
          groupByFields: {
            buckets: [
              {
                key: ['user:alice'],
                key_as_string: 'user:alice',
                selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
                doc_count: 2,
                resolutionRiskScore: { value: 85 },
              },
            ],
          },
          groupsCount: { value: 1 },
          unitsCount: { value: 1 },
        },
        targetMetadata: new Map(),
      },
      isFetching: false,
    });
  });

  it('passes through the synthesized bucket with key as array, key_as_string, selectedGroup, doc_count, and resolutionRiskScore', () => {
    const { result } = renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: undefined }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const groupData = result.current.groupData as unknown as {
      groupByFields: { buckets: Array<Record<string, unknown>> };
    };
    const [bucket] = groupData.groupByFields.buckets;

    expect(bucket.key).toEqual(['user:alice']);
    expect(bucket.key_as_string).toBe('user:alice');
    expect(bucket.selectedGroup).toBe(ENTITY_GROUPING_OPTIONS.RESOLUTION);
    expect(bucket.doc_count).toBe(2);
    expect(bucket.resolutionRiskScore).toEqual({ value: 85 });
  });

  // Expansion regression: bucket.key must be an array so @kbn/grouping generates the right
  // match_phrase filter, which processGroupFilters then converts to buildResolutionBoolQuery.
  // A bare string instead of [string] would break the expansion child query.
  it('bucket.key is an array of exactly one string (required for group expansion)', () => {
    const { result } = renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ query: undefined }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    const groupData = result.current.groupData as unknown as {
      groupByFields: {
        buckets: Array<{ key: unknown; key_as_string: string }>;
      };
    };
    const [bucket] = groupData.groupByFields.buckets;

    expect(Array.isArray(bucket.key)).toBe(true);
    expect((bucket.key as string[]).length).toBe(1);
    expect(typeof (bucket.key as string[])[0]).toBe('string');
    // key[0] === key_as_string is the targetId that drives buildResolutionBoolQuery
    expect((bucket.key as string[])[0]).toBe(bucket.key_as_string);
  });

  it('hooks are called with pageIndex and pageSize from state', () => {
    renderHook(
      () =>
        useEntityGrouping({
          state: createMockState({ pageIndex: 3, pageSize: 50 }),
          selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
          tableId: 'test-table',
          groupingId: 'test-grouping',
        }),
      { wrapper }
    );

    expect(mockUnfilteredResolutionResult.mock.calls[0][0]).toMatchObject({
      pageIndex: 3,
      pageSize: 50,
    });
  });
});
