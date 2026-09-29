/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorsPage } from './indicators';
import { useAggregatedIndicators } from '../hooks/use_aggregated_indicators';
import { useIndicators } from '../hooks/use_indicators';
import { useFilters } from '../../query_bar/hooks/use_filters';
import moment from 'moment';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { TABLE_TEST_ID } from '../components/table/test_ids';
import { mockTimeRange } from '../../../mocks/mock_indicators_filters_context';

vi.mock('../../query_bar/hooks/use_filters');
vi.mock('../hooks/use_indicators');
vi.mock('../hooks/use_aggregated_indicators');

vi.mock('../../../../common/components/filters_global', () => {
      const mocked = {
      FiltersGlobal: () => <div data-test-subj="SiemSearchBar" />,
    };
      return { ...mocked, default: mocked };
    });

const stub = () => {};

describe('<IndicatorsPage />', () => {
  beforeAll(() => {
    (
      useAggregatedIndicators as MockedFunction<typeof useAggregatedIndicators>
    ).mockReturnValue({
      dateRange: { min: moment(), max: moment() },
      series: [],
      selectedField: { label: 'threat.feed.name', value: 'string' },
      onFieldChange: () => {},
      query: {
        id: 'chart',
        loading: false,
        refetch: stub,
      },
    });

    (useIndicators as MockedFunction<typeof useIndicators>).mockReturnValue({
      indicators: [{ fields: {} }],
      indicatorCount: 1,
      isLoading: false,
      isFetching: false,
      pagination: { pageIndex: 0, pageSize: 10, pageSizeOptions: [10] },
      onChangeItemsPerPage: stub,
      onChangePage: stub,
      dataUpdatedAt: Date.now(),
      query: {
        id: 'list',
        loading: false,
        refetch: stub,
      },
    });

    (useFilters as MockedFunction<typeof useFilters>).mockReturnValue({
      filters: [],
      filterQuery: { language: 'kuery', query: '' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterManager: {} as any,
      timeRange: mockTimeRange,
    });
  });

  it('should render the table', () => {
    const { queryByTestId } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });

    expect(queryByTestId(TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render SIEM Search Bar', () => {
    const { queryByTestId } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });
    expect(queryByTestId('SiemSearchBar')).toBeInTheDocument();
  });

  it('should render stack by selector', () => {
    const { queryByText } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });
    expect(queryByText('Stack by')).toBeInTheDocument();
  });
});
