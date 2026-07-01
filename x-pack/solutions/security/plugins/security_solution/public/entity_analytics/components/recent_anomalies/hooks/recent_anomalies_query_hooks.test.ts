/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { getLatestEntitiesIndexName } from '@kbn/entity-store/common';
import { useRecentAnomaliesQuery } from './recent_anomalies_query_hooks';
import {
  useRecentAnomaliesTopRowsEsqlSource,
  useRecentAnomaliesDataEsqlSource,
} from './recent_anomalies_esql_source_query_hooks';
import { useKibana } from '../../../../common/lib/kibana';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { useEsqlTimeRangeFilter } from '../../../../common/hooks/esql/use_esql_global_filter';
import { useGlobalTime } from '../../../../common/containers/use_global_time';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@kbn/esql-utils', () => ({
  prettifyQuery: jest.fn((q) => q),
  getESQLResults: jest.fn(),
}));
jest.mock('@kbn/entity-store/common', () => ({ getLatestEntitiesIndexName: jest.fn() }));
jest.mock('./recent_anomalies_esql_source_query_hooks', () => ({
  useRecentAnomaliesTopRowsEsqlSource: jest.fn(),
  useRecentAnomaliesDataEsqlSource: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../common/hooks/use_global_filter_query', () => ({
  useGlobalFilterQuery: jest.fn(),
}));
jest.mock('../../../../common/hooks/esql/use_esql_global_filter', () => ({
  useEsqlTimeRangeFilter: jest.fn(),
}));
jest.mock('../../../../common/containers/use_global_time', () => ({ useGlobalTime: jest.fn() }));
jest.mock('../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockGetESQLResults = getESQLResults as jest.Mock;
const mockGetLatestEntitiesIndexName = getLatestEntitiesIndexName as jest.Mock;
const mockTopRowsSource = useRecentAnomaliesTopRowsEsqlSource as jest.Mock;
const mockDataSource = useRecentAnomaliesDataEsqlSource as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseGlobalFilterQuery = useGlobalFilterQuery as jest.Mock;
const mockUseEsqlTimeRangeFilter = useEsqlTimeRangeFilter as jest.Mock;
const mockUseGlobalTime = useGlobalTime as jest.Mock;

const TOP_ROWS_SQL = 'TOP_ROWS_SQL';
const DATA_SQL = 'DATA_SQL';
const TIME_FILTER = 'TIME_FILTER';
const EMPTY_BOOL = { bool: { must: [], filter: [], should: [], must_not: [] } };
const ACTIVE_BOOL = {
  bool: {
    must: [],
    filter: [{ match_phrase: { 'host.name': 'test_host_01' } }],
    should: [],
    must_not: [],
  },
};

const FIXED_RANGE = { from: 'now-30d', to: 'now' };
const baseParams = {
  anomalyBands: [],
  viewBy: 'entity' as const,
  spaceId: 'default',
  timeRange: FIXED_RANGE,
};

// Controlled by each test, consumed by the mocked useQuery implementation.
let resolvedEntityIds: string[] | undefined;
let resolveLoading: boolean;
let topRowsRecords: Array<Record<string, string>>;

const RESOLUTION_KEY = 'recent-anomalies-filtered-entity-ids';
const callFor = (predicate: (key: unknown) => boolean) =>
  mockUseQuery.mock.calls.find(([key]) => predicate(key));
const resolutionCall = () => callFor((key) => Array.isArray(key) && key[0] === RESOLUTION_KEY);
const topRowsCall = () => callFor((key) => Array.isArray(key) && key[1] === TOP_ROWS_SQL);
const dataCall = () => callFor((key) => Array.isArray(key) && key[1] === DATA_SQL);
const lastTopRowsParams = () => mockTopRowsSource.mock.calls.at(-1)?.[0];

describe('useRecentAnomaliesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolvedEntityIds = undefined;
    resolveLoading = false;
    topRowsRecords = [];

    mockUseKibana.mockReturnValue({ services: { data: { search: { search: jest.fn() } } } });
    mockUseGlobalTime.mockReturnValue({ from: 'global-from', to: 'global-to' });
    mockUseEsqlTimeRangeFilter.mockReturnValue(TIME_FILTER);
    mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: EMPTY_BOOL });
    mockGetLatestEntitiesIndexName.mockReturnValue('entities-latest-default');
    mockTopRowsSource.mockReturnValue(TOP_ROWS_SQL);
    mockDataSource.mockReturnValue(DATA_SQL);
    mockGetESQLResults.mockResolvedValue({ response: { columns: [], values: [] } });

    mockUseQuery.mockImplementation((queryKey, _queryFn, _options) => {
      const key = queryKey as unknown[];
      if (key[0] === RESOLUTION_KEY) {
        return { data: resolvedEntityIds, isLoading: resolveLoading };
      }
      if (key[1] === TOP_ROWS_SQL) {
        return {
          isLoading: false,
          isError: false,
          data: { records: topRowsRecords, rawResponse: { columns: [], values: [] } },
        };
      }
      return {
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
        data: { anomalyRecords: [], rowLabels: [] },
      };
    });
  });

  describe('time range filter', () => {
    it('uses the fixed time range when one is provided', () => {
      renderHook(() => useRecentAnomaliesQuery(baseParams));
      expect(mockUseEsqlTimeRangeFilter).toHaveBeenCalledWith('now-30d', 'now');
    });

    it('falls back to the global date picker range when no time range is provided', () => {
      renderHook(() => useRecentAnomaliesQuery({ ...baseParams, timeRange: undefined }));
      expect(mockUseEsqlTimeRangeFilter).toHaveBeenCalledWith('global-from', 'global-to');
    });

    it('applies only the time filter to the anomaly query, not the search bar filters', async () => {
      mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: ACTIVE_BOOL });
      resolvedEntityIds = ['host:test_host_01'];
      topRowsRecords = [{ entity_id: 'host:test_host_01', entity_name: 'h1', entity_type: 'host' }];

      renderHook(() => useRecentAnomaliesQuery(baseParams));

      await topRowsCall()![1]({ signal: undefined });
      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ filter: TIME_FILTER })
      );
    });
  });

  describe('when no search bar filter is active', () => {
    it('does not constrain the anomaly query by entity id', () => {
      renderHook(() => useRecentAnomaliesQuery(baseParams));
      expect(lastTopRowsParams().entityIds).toBeUndefined();
    });

    it('does not run the entity resolution query', () => {
      renderHook(() => useRecentAnomaliesQuery(baseParams));
      const call = resolutionCall();
      // esqlSource is undefined when no filter is active, so the query is disabled
      expect(call![0][1]).toBeUndefined();
      expect(call![2].enabled).toBe(false);
    });
  });

  describe('when a search bar filter is active', () => {
    beforeEach(() => {
      mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: ACTIVE_BOOL });
    });

    it('resolves matching entity ids from the entity store', async () => {
      resolvedEntityIds = ['host:test_host_01'];
      mockGetESQLResults.mockResolvedValue({
        response: { columns: [{ name: 'entity.id' }], values: [['host:test_host_01']] },
      });

      renderHook(() => useRecentAnomaliesQuery(baseParams));

      const call = resolutionCall();
      expect(call![2].enabled).toBe(true);
      expect(call![0][1]).toContain('FROM entities-latest-default');
      expect(call![0][1]).toContain('KEEP entity.id');

      const resolved = await call![1]({ signal: undefined });
      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ filter: ACTIVE_BOOL })
      );
      expect(resolved).toEqual(['host:test_host_01']);
    });

    it('constrains the anomaly query to the resolved entity ids', () => {
      resolvedEntityIds = ['host:test_host_01'];
      renderHook(() => useRecentAnomaliesQuery(baseParams));
      expect(lastTopRowsParams().entityIds).toEqual(['host:test_host_01']);
    });

    it('returns no anomalies when the filter matches no entities', async () => {
      resolvedEntityIds = [];
      renderHook(() => useRecentAnomaliesQuery(baseParams));

      mockGetESQLResults.mockClear();
      const result = await dataCall()![1]({ signal: undefined });

      expect(result).toEqual({ anomalyRecords: [], rowLabels: [] });
      expect(mockGetESQLResults).not.toHaveBeenCalled();
    });
  });
});
