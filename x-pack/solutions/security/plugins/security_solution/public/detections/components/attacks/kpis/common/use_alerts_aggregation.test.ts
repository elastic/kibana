/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { Filter, Query } from '@kbn/es-query';
import type { estypes } from '@elastic/elasticsearch';
import { useAlertsAggregation } from './use_alerts_aggregation';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../common/lib/kibana';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { fetchQueryUnifiedAlerts } from '../../../../containers/detection_engine/alerts/api';
import { useInspectButton } from '../../../alerts_kpis/common/hooks';

vi.mock('../../../../containers/detection_engine/alerts/use_query');
vi.mock('../../../../../common/containers/use_global_time');
vi.mock('../../../../../common/lib/kibana');
vi.mock('../../../alerts_kpis/common/hooks');

describe('useAlertsAggregation', () => {
  const mockFrom = 'now-15m';
  const mockTo = 'now';
  const mockUiSettings = {
    get: vi.fn().mockReturnValue(true),
  };
  const mockRefetch = vi.fn();
  const mockSetAlertsQuery = vi.fn();
  const mockDeleteQuery = vi.fn();
  const mockSetGlobalQuery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGlobalTime as Mock).mockReturnValue({
      from: mockFrom,
      to: mockTo,
      deleteQuery: mockDeleteQuery,
      setQuery: mockSetGlobalQuery,
    });
    (useKibana as Mock).mockReturnValue({ services: { uiSettings: mockUiSettings } });
    (useQueryAlerts as Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetch,
      request: 'request',
      response: 'response',
      setQuery: mockSetAlertsQuery,
    });
  });

  it('constructs query with time range and filters', () => {
    const filters = [{ meta: { disabled: false }, query: { match_all: {} } }] as Filter[];
    const query = { query: 'test' } as unknown as Query;
    const aggs = { my_agg: { terms: { field: 'test' } } } as Record<
      string,
      estypes.AggregationsAggregationContainer
    >;

    renderHook(() =>
      useAlertsAggregation({
        filters,
        query,
        aggs,
        queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
      })
    );

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchMethod: fetchQueryUnifiedAlerts,
        query: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                expect.objectContaining({
                  range: {
                    '@timestamp': {
                      gte: mockFrom,
                      lte: mockTo,
                    },
                  },
                }),
              ]),
            }),
          }),
          aggs,
          size: 0,
        }),
      })
    );
  });

  it('updates query when dependencies change', () => {
    const { rerender } = renderHook(
      ({ size }) =>
        useAlertsAggregation({
          aggs: {},
          queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
          size,
        }),
      {
        initialProps: { size: 0 },
      }
    );

    expect(mockSetAlertsQuery).toHaveBeenCalledWith(expect.objectContaining({ size: 0 }));

    rerender({ size: 10 });

    expect(mockSetAlertsQuery).toHaveBeenCalledWith(expect.objectContaining({ size: 10 }));
  });

  it('returns data, loading, and refetch from useQueryAlerts', () => {
    const mockData = { aggregations: { test: { value: 1 } } };
    (useQueryAlerts as Mock).mockReturnValue({
      data: mockData,
      loading: true,
      refetch: mockRefetch,
      request: 'request',
      response: 'response',
      setQuery: mockSetAlertsQuery,
    });

    const { result } = renderHook(() =>
      useAlertsAggregation({
        aggs: {},
        queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
      })
    );

    expect(result.current.data).toBe(mockData);
    expect(result.current.loading).toBe(true);
    result.current.refetch();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('registers the query for global refetch after mutations', () => {
    renderHook(() =>
      useAlertsAggregation({
        aggs: {},
        queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
      })
    );

    expect(useInspectButton).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteQuery: mockDeleteQuery,
        setQuery: mockSetGlobalQuery,
        uniqueQueryId: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
      })
    );
  });

  it('uses custom uniqueQueryId when provided', () => {
    renderHook(() =>
      useAlertsAggregation({
        aggs: {},
        queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
        uniqueQueryId: 'attacks-kpi-attacks-list',
      })
    );

    expect(useInspectButton).toHaveBeenCalledWith(
      expect.objectContaining({
        uniqueQueryId: 'attacks-kpi-attacks-list',
      })
    );
  });
});
