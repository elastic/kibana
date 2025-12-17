/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { useKibana } from '../../../hooks/use_kibana';
import { render } from '../../../utils/test_helper';
import { buildSlo } from '../../../data/slo/slo';
import { HistoricalDataCharts } from './historical_data_charts';
import type { FetchHistoricalSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';

jest.mock('../../../hooks/use_fetch_historical_summary');
jest.mock('../../../hooks/use_kibana');

const useKibanaMock = useKibana as jest.Mock;

const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;

const mockHistoricalSummaryData: FetchHistoricalSummaryResponse = [
  {
    sloId: 'test-slo-id',
    instanceId: ALL_VALUE,
    data: [
      {
        date: '2024-01-01T00:00:00.000Z',
        status: 'HEALTHY',
        sliValue: 0.99,
        errorBudget: {
          initial: 0.05,
          consumed: 0.02,
          remaining: 0.98,
          isEstimated: false,
        },
      },
      {
        date: '2024-01-02T00:00:00.000Z',
        status: 'HEALTHY',
        sliValue: 0.98,
        errorBudget: {
          initial: 0.05,
          consumed: 0.04,
          remaining: 0.96,
          isEstimated: false,
        },
      },
      {
        date: '2024-01-03T00:00:00.000Z',
        status: 'HEALTHY',
        sliValue: 0.97,
        errorBudget: {
          initial: 0.05,
          consumed: 0.06,
          remaining: 0.94,
          isEstimated: false,
        },
      },
    ],
  },
];

describe('HistoricalDataCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        theme: {},
        charts: chartPluginMock.createStartContract(),
        executionContext: {
          get: () => ({
            name: 'slo',
          }),
        },
        uiSettings: {
          get: (settings: string) => {
            if (settings === 'format:percent:defaultPattern') return '0.0%';
            if (settings === 'dateFormat') return 'YYYY-MM-DD';
            return '';
          },
        },
      },
    });
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      data: mockHistoricalSummaryData,
    });
  });

  it('renders both SLI and error budget chart panels', () => {
    const slo = buildSlo({ id: 'test-slo-id' });
    render(<HistoricalDataCharts slo={slo} isAutoRefreshing={false} />);

    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
  });

  it('calculates observed value from the latest entry in historical data', () => {
    const slo = buildSlo({ id: 'test-slo-id' });
    render(<HistoricalDataCharts slo={slo} isAutoRefreshing={false} />);

    // The observed value should be from the latest entry (0.97 from 2024-01-03)
    // Format: 0.97 -> 97.0%
    expect(screen.getByText('97.0%')).toBeTruthy();
  });

  it('filters out NO_DATA entries when calculating observed value', () => {
    const historicalDataWithNoData: FetchHistoricalSummaryResponse = [
      {
        sloId: 'test-slo-id',
        instanceId: ALL_VALUE,
        data: [
          {
            date: '2024-01-01T00:00:00.000Z',
            status: 'NO_DATA',
            sliValue: -1,
            errorBudget: {
              initial: 0.05,
              consumed: 0,
              remaining: 1,
              isEstimated: false,
            },
          },
          {
            date: '2024-01-02T00:00:00.000Z',
            status: 'HEALTHY',
            sliValue: 0.95,
            errorBudget: {
              initial: 0.05,
              consumed: 0.1,
              remaining: 0.9,
              isEstimated: false,
            },
          },
        ],
      },
    ];

    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      data: historicalDataWithNoData,
    });

    const slo = buildSlo({ id: 'test-slo-id' });
    render(<HistoricalDataCharts slo={slo} isAutoRefreshing={false} />);

    // Should use the valid entry (0.95), not the NO_DATA entry
    expect(screen.getByText('95.0%')).toBeTruthy();
  });

  it('handles empty historical data', () => {
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      data: [
        {
          sloId: 'test-slo-id',
          instanceId: ALL_VALUE,
          data: [],
        },
      ],
    });

    const slo = buildSlo({ id: 'test-slo-id' });
    render(<HistoricalDataCharts slo={slo} isAutoRefreshing={false} />);

    // Should still render the panels, but use slo.summary.sliValue as fallback
    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
  });

  it('handles all NO_DATA entries', () => {
    const allNoDataHistoricalSummary: FetchHistoricalSummaryResponse = [
      {
        sloId: 'test-slo-id',
        instanceId: ALL_VALUE,
        data: [
          {
            date: '2024-01-01T00:00:00.000Z',
            status: 'NO_DATA',
            sliValue: -1,
            errorBudget: {
              initial: 0.05,
              consumed: 0,
              remaining: 1,
              isEstimated: false,
            },
          },
          {
            date: '2024-01-02T00:00:00.000Z',
            status: 'NO_DATA',
            sliValue: -1,
            errorBudget: {
              initial: 0.05,
              consumed: 0,
              remaining: 1,
              isEstimated: false,
            },
          },
        ],
      },
    ];

    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      data: allNoDataHistoricalSummary,
    });

    const slo = buildSlo({ id: 'test-slo-id' });
    render(<HistoricalDataCharts slo={slo} isAutoRefreshing={false} />);

    // Should still render the panels, but use slo.summary.sliValue as fallback
    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
  });

  it('respects the time range when fetching historical data', () => {
    const slo = buildSlo({ id: 'test-slo-id' });
    const range = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-03'),
    };

    render(<HistoricalDataCharts slo={slo} isAutoRefreshing={false} range={range} />);

    // Verify that useFetchHistoricalSummary was called with the range
    expect(useFetchHistoricalSummaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        range,
      })
    );
  });
});
