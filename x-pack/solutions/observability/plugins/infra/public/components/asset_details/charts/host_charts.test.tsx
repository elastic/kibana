/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import { HostCharts } from './host_charts';
import { useHostCharts } from '../hooks/use_host_metrics_charts';
import { HOST_METRIC_GROUP_TITLES } from '../translations';
import type { HostMetricTypes } from './types';

jest.mock('../hooks/use_host_metrics_charts');
jest.mock('./chart', () => ({
  Chart: ({ id }: { id: string }) => <div data-test-subj={`chart-${id}`} />,
}));

const useHostChartsMock = useHostCharts as jest.MockedFunction<typeof useHostCharts>;

const dateRange: TimeRange = {
  from: '2023-03-28T18:20:00.000Z',
  to: '2023-03-28T18:21:00.000Z',
};

const SHOW_ALL_TEST_SUBJ = 'infraAssetDetailsHostChartsShowAllButton';

const renderHostCharts = ({
  metric,
  onShowAll,
}: {
  metric: Exclude<HostMetricTypes, 'kpi'>;
  onShowAll?: (metric: string) => void;
}) =>
  render(
    <I18nProvider>
      <HostCharts entityId="host-1" dateRange={dateRange} metric={metric} onShowAll={onShowAll} />
    </I18nProvider>
  );

describe('HostCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useHostChartsMock.mockReturnValue({
      charts: [{ id: 'cpuUsage' }],
    } as unknown as ReturnType<typeof useHostCharts>);
  });

  it.each(['cpu', 'memory', 'network', 'disk'] as const)(
    'calls onShowAll with the %s metric group when Show all is clicked',
    async (metric) => {
      const onShowAll = jest.fn();
      renderHostCharts({ metric, onShowAll });

      await userEvent.click(screen.getByTestId(SHOW_ALL_TEST_SUBJ));

      expect(onShowAll).toHaveBeenCalledWith(metric);
    }
  );

  it.each(['cpu', 'memory', 'network', 'disk', 'log'] as const)(
    'renders the %s section under its metric group title',
    (metric) => {
      renderHostCharts({ metric, onShowAll: jest.fn() });

      expect(screen.getByTestId(`infraAssetDetailsHostChartsSection${metric}`)).toBeInTheDocument();
      expect(
        screen.getByTestId(`infraAssetDetailsHostChartsSection${metric}Title`)
      ).toHaveTextContent(HOST_METRIC_GROUP_TITLES[metric]);
    }
  );

  it('omits the Show all action when no handler is provided', () => {
    renderHostCharts({ metric: 'cpu' });

    expect(screen.queryByTestId(SHOW_ALL_TEST_SUBJ)).not.toBeInTheDocument();
  });
});
