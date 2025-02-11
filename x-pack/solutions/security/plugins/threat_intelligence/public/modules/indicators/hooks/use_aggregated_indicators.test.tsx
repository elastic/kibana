/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useAggregatedIndicators, UseAggregatedIndicatorsParam } from './use_aggregated_indicators';
import { mockedTimefilterService, TestProvidersComponent } from '../../../mocks/test_providers';
import { createFetchAggregatedIndicators } from '../services/fetch_aggregated_indicators';
import { mockTimeRange } from '../../../mocks/mock_indicators_filters_context';

jest.mock('../services/fetch_aggregated_indicators');

const useAggregatedIndicatorsParams: UseAggregatedIndicatorsParam = {
  timeRange: mockTimeRange,
  filters: [],
  filterQuery: { language: 'kuery', query: '' },
};

const renderUseAggregatedIndicators = () =>
  renderHook((props: UseAggregatedIndicatorsParam) => useAggregatedIndicators(props), {
    initialProps: useAggregatedIndicatorsParams,
    wrapper: TestProvidersComponent,
  });

describe('useAggregatedIndicators()', () => {
  beforeEach(jest.clearAllMocks);

  type MockedCreateFetchAggregatedIndicators = jest.MockedFunction<
    typeof createFetchAggregatedIndicators
  >;
  let aggregatedIndicatorsQuery: jest.MockedFunction<
    ReturnType<typeof createFetchAggregatedIndicators>
  >;

  beforeEach(jest.clearAllMocks);

  beforeEach(() => {
    aggregatedIndicatorsQuery = jest.fn();
    (createFetchAggregatedIndicators as MockedCreateFetchAggregatedIndicators).mockReturnValue(
      aggregatedIndicatorsQuery
    );
  });

  it('should create and call the aggregatedIndicatorsQuery correctly', async () => {
    aggregatedIndicatorsQuery.mockResolvedValue([]);

    const { result, rerender } = renderUseAggregatedIndicators();

    // indicators service and the query should be called just once
    expect(
      createFetchAggregatedIndicators as MockedCreateFetchAggregatedIndicators
    ).toHaveBeenCalledTimes(1);
    expect(aggregatedIndicatorsQuery).toHaveBeenCalledTimes(1);

    // Ensure the timefilter service is called
    expect(mockedTimefilterService.timefilter.calculateBounds).toHaveBeenCalled();
    // Call the query function
    expect(aggregatedIndicatorsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filterQuery: { language: 'kuery', query: '' },
      }),
      expect.any(AbortSignal)
    );

    await act(async () =>
      rerender({
        filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
        filters: [],
        timeRange: mockTimeRange,
      })
    );

    expect(aggregatedIndicatorsQuery).toHaveBeenCalledTimes(2);
    expect(aggregatedIndicatorsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
      }),
      expect.any(AbortSignal)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "dateRange": Object {
          "max": "2022-01-02T00:00:00.000Z",
          "min": "2022-01-01T00:00:00.000Z",
        },
        "isFetching": false,
        "isLoading": false,
        "onFieldChange": [Function],
        "query": Object {
          "id": "indicatorsBarchart",
          "loading": false,
          "refetch": [Function],
        },
        "selectedField": Object {
          "label": "threat.feed.name",
          "value": "string",
        },
        "series": Array [],
      }
    `);
  });
});
