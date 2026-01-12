/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFetchHistoricalSummary } from '../../../../hooks/use_fetch_historical_summary';
import { render } from '../../../../utils/test_helper';
import { buildSlo } from '../../../../data/slo/slo';
import { buildCalendarAlignedTimeWindow } from '../../../../data/slo/time_window';
import { buildRollingTimeWindow } from '../../../../data/slo/time_window';
import { SloDetailsHistory } from './slo_details_history';
import type { FetchHistoricalSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_fetch_historical_summary');

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

describe('SloDetailsHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        theme: {},
        lens: {
          EmbeddableComponent: () => <div data-test-subj="errorRateChart">mocked component</div>,
        },
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
            if (settings === 'timepicker:quickRanges') {
              return [
                { from: 'now-15m', to: 'now', display: 'Last 15 minutes' },
                { from: 'now-1h', to: 'now', display: 'Last hour' },
              ];
            }
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

  it('renders the history view with error rate panel', () => {
    const slo = buildSlo();
    render(<SloDetailsHistory slo={slo} />);

    expect(screen.queryByTestId('errorRatePanel')).toBeTruthy();
  });

  it('renders observed value and objective in the history view', () => {
    const slo = buildSlo();
    render(<SloDetailsHistory slo={slo} />);

    // Check that observed value is visible (from the latest historical data entry)
    const observedValueText = screen.getByText('Observed value');
    expect(observedValueText).toBeTruthy();

    // Check that objective is visible
    const objectiveText = screen.getByText('Objective');
    expect(objectiveText).toBeTruthy();
  });

  it('displays observed value from historical data within time range', () => {
    const slo = buildSlo({ id: 'test-slo-id' });
    render(<SloDetailsHistory slo={slo} />);

    // The observed value should be from the latest entry (0.97 from 2024-01-03)
    // Format: 0.97 -> 97.0%
    expect(screen.getByText('97.0%')).toBeTruthy();
  });

  it('displays objective value correctly', () => {
    const slo = buildSlo({ objective: { target: 0.95 } });
    render(<SloDetailsHistory slo={slo} />);

    // Objective should be 95.0%
    expect(screen.getByText('95.0%')).toBeTruthy();
  });

  it('works with calendar aligned time window', () => {
    const slo = buildSlo({
      timeWindow: buildCalendarAlignedTimeWindow(),
    });
    render(<SloDetailsHistory slo={slo} />);

    expect(screen.queryByTestId('errorRatePanel')).toBeTruthy();
    expect(screen.getByText('Observed value')).toBeTruthy();
    expect(screen.getByText('Objective')).toBeTruthy();
  });

  it('works with rolling time window', () => {
    const slo = buildSlo({
      timeWindow: buildRollingTimeWindow(),
    });
    render(<SloDetailsHistory slo={slo} />);

    expect(screen.queryByTestId('errorRatePanel')).toBeTruthy();
    expect(screen.getByText('Observed value')).toBeTruthy();
    expect(screen.getByText('Objective')).toBeTruthy();
  });

  it('handles NO_DATA status in historical data', () => {
    const noDataHistoricalSummary: FetchHistoricalSummaryResponse = [
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
        ],
      },
    ];

    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      data: noDataHistoricalSummary,
    });

    const slo = buildSlo();
    render(<SloDetailsHistory slo={slo} />);

    // Should still show the metadata section
    expect(screen.getByText('Observed value')).toBeTruthy();
    expect(screen.getByText('Objective')).toBeTruthy();
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

    const slo = buildSlo();
    render(<SloDetailsHistory slo={slo} />);

    // Should still render the component
    expect(screen.queryByTestId('errorRatePanel')).toBeTruthy();
    expect(screen.getByText('Observed value')).toBeTruthy();
    expect(screen.getByText('Objective')).toBeTruthy();
  });
});
