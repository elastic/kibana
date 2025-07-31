/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import type { UseAggregatedIndicatorsParam } from './use_aggregated_indicators';
import { useAggregatedIndicators } from './use_aggregated_indicators';
import { createFetchAggregatedIndicators } from '../services/fetch_aggregated_indicators';
import { mockTimeRange } from '../../../mocks/mock_indicators_filters_context';
import {
  TestProvidersComponent,
  mockedQueryService,
  mockedSearchService,
} from '../../../mocks/test_providers';
import { useKibana } from '../../../../common/lib/kibana';
import moment from 'moment';

jest.mock('../services/fetch_aggregated_indicators');
jest.mock('../../../../common/lib/kibana');

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

  beforeEach(() => {
    jest.mocked(useKibana).mockReturnValue({
      services: { data: { search: mockedSearchService, query: mockedQueryService } },
    } as unknown as ReturnType<typeof useKibana>);
  });

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

    // Call the query function
    expect(aggregatedIndicatorsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filterQuery: { language: 'kuery', query: '' },
      }),
      expect.any(AbortSignal)
    );

    expect(mockedQueryService.timefilter.timefilter.calculateBounds).toHaveBeenCalled();

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

    expect(result.current).toMatchObject(
      expect.objectContaining({
        dateRange: expect.objectContaining({
          min: expect.any(moment),
          max: expect.any(moment),
        }),
        isFetching: false,
        isLoading: false,
        onFieldChange: expect.any(Function),
        query: expect.objectContaining({
          id: 'indicatorsBarchart',
          loading: false,
          refetch: expect.any(Function),
        }),
        selectedField: {
          label: 'threat.feed.name',
          value: 'string',
        },
        series: [],
      })
    );
  });
});
