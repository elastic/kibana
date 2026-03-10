/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Filter, Query } from '@kbn/es-query';
import type { estypes } from '@elastic/elasticsearch';
import { useAlertsAggregation } from './use_alerts_aggregation';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../common/lib/kibana';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';

jest.mock('../../../../containers/detection_engine/alerts/use_query');
jest.mock('../../../../../common/containers/use_global_time');
jest.mock('../../../../../common/lib/kibana');

describe('useAlertsAggregation', () => {
  const mockFrom = 'now-15m';
  const mockTo = 'now';
  const mockUiSettings = {
    get: jest.fn().mockReturnValue(true),
  };
  const mockRefetch = jest.fn();
  const mockSetQuery = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useGlobalTime as jest.Mock).mockReturnValue({ from: mockFrom, to: mockTo });
    (useKibana as jest.Mock).mockReturnValue({ services: { uiSettings: mockUiSettings } });
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: undefined,
      loading: false,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
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

    expect(mockSetQuery).toHaveBeenCalledWith(expect.objectContaining({ size: 0 }));

    rerender({ size: 10 });

    expect(mockSetQuery).toHaveBeenCalledWith(expect.objectContaining({ size: 10 }));
  });

  it('returns data, loading, and refetch from useQueryAlerts', () => {
    const mockData = { aggregations: { test: { value: 1 } } };
    (useQueryAlerts as jest.Mock).mockReturnValue({
      data: mockData,
      loading: true,
      refetch: mockRefetch,
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() =>
      useAlertsAggregation({
        aggs: {},
        queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
      })
    );

    expect(result.current.data).toBe(mockData);
    expect(result.current.loading).toBe(true);
    expect(result.current.refetch).toBe(mockRefetch);
  });
});
