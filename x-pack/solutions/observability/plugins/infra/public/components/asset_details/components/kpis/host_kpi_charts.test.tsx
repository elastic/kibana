/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import { HostKpiCharts } from './host_kpi_charts';
import { useHostKpiCharts } from '../../hooks/use_host_metrics_charts';

jest.mock('../../hooks/use_host_metrics_charts');
jest.mock('./kpi', () => ({
  // Kibana config sets Testing Library's testIdAttribute to `data-test-subj`,
  // so `screen.getByTestId()` queries that attribute (not `data-testid`).
  Kpi: ({ id }: { id: string }) => <div data-test-subj={`kpi-${id}`} />,
}));

const useHostKpiChartsMock = useHostKpiCharts as jest.MockedFunction<typeof useHostKpiCharts>;

const dateRange: TimeRange = {
  from: '2023-03-28T18:20:00.000Z',
  to: '2023-03-28T18:21:00.000Z',
};

const renderWithI18n = (node: React.ReactElement) => render(<I18nProvider>{node}</I18nProvider>);

describe('HostKpiCharts', () => {
  beforeEach(() => {
    useHostKpiChartsMock.mockReturnValue([
      { id: 'cpuUsage' },
      { id: 'normalizedLoad1m' },
      { id: 'memoryUsage' },
      { id: 'diskUsage' },
    ] as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders KPI panels when loading', () => {
    renderWithI18n(<HostKpiCharts dateRange={dateRange} loading />);

    expect(screen.getByTestId('kpi-cpuUsage')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-normalizedLoad1m')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-memoryUsage')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-diskUsage')).toBeInTheDocument();
  });

  it('renders empty placeholders when hasData is false', () => {
    renderWithI18n(<HostKpiCharts dateRange={dateRange} hasData={false} />);

    expect(screen.getAllByText('No results found')).toHaveLength(4);
  });

  it('renders error placeholders when error is provided', () => {
    renderWithI18n(
      <HostKpiCharts dateRange={dateRange} error={{ message: 'boom' } as any} loading={false} />
    );

    expect(screen.getAllByText('boom')).toHaveLength(4);
  });
});
