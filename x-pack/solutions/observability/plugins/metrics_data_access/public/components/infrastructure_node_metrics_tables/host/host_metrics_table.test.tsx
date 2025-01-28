/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreProviders } from '../../../apps/common_providers';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { MetricsExplorerSeries } from '../../../../common/http_api';
import { createStartServicesAccessorMock, createMetricsClientMock } from '../test_helpers';
import { createLazyHostMetricsTable } from './create_lazy_host_metrics_table';
import { HostMetricsTable } from './host_metrics_table';
import IntegratedHostMetricsTable from './integrated_host_metrics_table';
import { metricByField } from './use_host_metrics_table';

jest.mock('../../../pages/link_to/use_asset_details_redirect', () => ({
  useAssetDetailsRedirect: jest.fn(() => ({
    getAssetDetailUrl: jest.fn(() => ({
      app: 'metrics',
      pathname: 'link-to/host-detail/example-01',
      search: { from: '1546340400000', to: '1546344000000' },
    })),
  })),
}));

describe('HostMetricsTable', () => {
  const timerange = {
    from: 'now-15m',
    to: 'now',
  };

  const filterClauseDsl = {
    bool: {
      should: [
        {
          match: {
            'host.name': 'gke-edge-oblt-pool-1-9a60016d-lgg9',
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  const mockData = {
    series: [
      createHost('some-host', 6, 76, 3671700000, 24),
      createHost('some-other-host', 12, 67, 7176300000, 42),
    ],
  };
  const getMetricsClient = () => createMetricsClientMock(mockData);

  const loadingIndicatorTestId = 'metricsTableLoadingContent';

  describe('createLazyHostMetricsTable', () => {
    it('should lazily load and render the table', async () => {
      const { getStartServices } = createStartServicesAccessorMock();
      const metricsClient = getMetricsClient();
      const LazyHostMetricsTable = createLazyHostMetricsTable(getStartServices()[0], metricsClient);

      render(<LazyHostMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />);

      expect(screen.queryByTestId(loadingIndicatorTestId)).not.toBeInTheDocument();
      expect(screen.queryByTestId('hostMetricsTable')).not.toBeInTheDocument();

      // Using longer time out since resolving dynamic import can be slow
      // https://github.com/facebook/jest/issues/10933
      await waitFor(
        () => {
          expect(metricsClient.metricsIndices).toHaveBeenCalledTimes(1);
          expect(metricsClient.metricsExplorer).toHaveBeenCalledTimes(1);
        },
        {
          timeout: 10000,
        }
      );

      expect(screen.queryByTestId(loadingIndicatorTestId)).not.toBeInTheDocument();
      expect(screen.queryByTestId('hostMetricsTable')).toBeInTheDocument();
    }, 10000);
  });

  describe('IntegratedHostMetricsTable', () => {
    it('should render a single row of data', async () => {
      const { coreProvidersPropsMock } = createStartServicesAccessorMock();
      const metricsClient = getMetricsClient();

      const { findByText } = render(
        <IntegratedHostMetricsTable
          timerange={timerange}
          filterClauseDsl={filterClauseDsl}
          sourceId="default"
          metricsClient={metricsClient}
          {...coreProvidersPropsMock}
        />
      );

      await waitFor(() => {
        expect(metricsClient.metricsIndices).toHaveBeenCalledTimes(1);
        expect(metricsClient.metricsExplorer).toHaveBeenCalledTimes(1);
      });

      expect(await findByText(/some-host/)).toBeInTheDocument();
    });
  });

  it('should render a loading indicator on first load', () => {
    const { coreProvidersPropsMock } = createStartServicesAccessorMock();

    const { queryByTestId } = render(
      <CoreProviders {...coreProvidersPropsMock}>
        <HostMetricsTable
          data={{ state: 'unknown' }}
          isLoading={true}
          setCurrentPageIndex={jest.fn()}
          setSortState={jest.fn()}
          sortState={{ field: 'name', direction: 'asc' }}
          timerange={{ from: new Date().toISOString(), to: new Date().toISOString() }}
        />
      </CoreProviders>
    );

    expect(queryByTestId(loadingIndicatorTestId)).toBeInTheDocument();
  });

  it('should render a prompt when indices are missing', () => {
    const { coreProvidersPropsMock } = createStartServicesAccessorMock();

    const { queryByTestId } = render(
      <CoreProviders {...coreProvidersPropsMock}>
        <HostMetricsTable
          data={{ state: 'no-indices' }}
          isLoading={false}
          setCurrentPageIndex={jest.fn()}
          setSortState={jest.fn()}
          sortState={{ field: 'name', direction: 'asc' }}
          timerange={{ from: new Date().toISOString(), to: new Date().toISOString() }}
        />
      </CoreProviders>
    );

    expect(queryByTestId('metricsTableLoadingContent')).toBeInTheDocument();
  });
});

function createHost(
  name: string,
  coreCount: number,
  cpuUsagePct: number,
  memoryBytes: number,
  memoryUsagePct: number
): Partial<MetricsExplorerSeries> {
  return {
    id: name,
    rows: [
      {
        [metricByField['system.cpu.cores']]: coreCount,
        [metricByField['system.cpu.total.norm.pct']]: cpuUsagePct,
        [metricByField['system.memory.total']]: memoryBytes,
        [metricByField['system.memory.used.pct']]: memoryUsagePct,
      } as MetricsExplorerSeries['rows'][number],
    ],
  };
}
