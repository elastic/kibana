/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KpiCharts } from './kpi_charts';
import * as useUnifiedSearchHooks from '../../hooks/use_unified_search';
import * as useHostCountHooks from '../../hooks/use_host_count';
import * as useAfterLoadedStateHooks from '../../hooks/use_after_loaded_state';
import { useReloadRequestTimeContext } from '../../../../../hooks/use_reload_request_time';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';

jest.mock('../../hooks/use_hosts_view', () => ({
  ...jest.requireActual('../../hooks/use_hosts_view'),
  useHostsViewContext: jest.fn(),
}));
jest.mock('../../hooks/use_unified_search');
jest.mock('../../hooks/use_host_count');
jest.mock('../../hooks/use_after_loaded_state');
jest.mock('../../../../../hooks/use_reload_request_time');
jest.mock('../../../../../containers/metrics_source');
jest.mock('../../../../../components/asset_details', () => ({
  HostKpiCharts: ({ error, loading, hasData }: any) => {
    // Real component logic: if (!loading && (!hasData || error)) show ChartPlaceholder
    // Otherwise show Kpi charts
    if (!loading && (!hasData || error)) {
      const HOST_KPI_CHARTS_COUNT = 4;
      return (
        <>
          {Array.from({ length: HOST_KPI_CHARTS_COUNT }).map((_, index) => (
            <div key={index} data-test-subj="chartPlaceholder">
              {error ? <div>{error.message}</div> : <div>No results found</div>}
            </div>
          ))}
        </>
      );
    }
    return <div data-test-subj="hostKpiCharts">HostKpiCharts</div>;
  },
}));

// Import after mocking
import { useHostsViewContext } from '../../hooks/use_hosts_view';

const mockUseHostsViewContext = useHostsViewContext as jest.MockedFunction<
  typeof useHostsViewContext
>;
const mockUseUnifiedSearchContext =
  useUnifiedSearchHooks.useUnifiedSearchContext as jest.MockedFunction<
    typeof useUnifiedSearchHooks.useUnifiedSearchContext
  >;
const mockUseHostCountContext = useHostCountHooks.useHostCountContext as jest.MockedFunction<
  typeof useHostCountHooks.useHostCountContext
>;
const mockUseAfterLoadedState = useAfterLoadedStateHooks.useAfterLoadedState as jest.MockedFunction<
  typeof useAfterLoadedStateHooks.useAfterLoadedState
>;
const mockUseReloadRequestTimeContext = useReloadRequestTimeContext as jest.MockedFunction<
  typeof useReloadRequestTimeContext
>;
const mockUseMetricsDataViewContext = useMetricsDataViewContext as jest.MockedFunction<
  typeof useMetricsDataViewContext
>;

const renderKpiCharts = () =>
  render(
    <I18nProvider>
      <KpiCharts />
    </I18nProvider>
  );

describe('KpiCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: {
        dateRange: { from: 'now-15m', to: 'now' },
        filters: [],
        panelFilters: [],
        query: { query: '', language: 'kuery' },
        limit: 100,
        preferredSchema: 'ecs',
      },
    } as unknown as ReturnType<typeof useUnifiedSearchHooks.useUnifiedSearchContext>);

    mockUseReloadRequestTimeContext.mockReturnValue({
      reloadRequestTime: 0,
      updateReloadRequestTime: jest.fn(),
    });

    mockUseHostCountContext.mockReturnValue({
      loading: false,
      count: 10,
    } as ReturnType<typeof useHostCountHooks.useHostCountContext>);

    mockUseMetricsDataViewContext.mockReturnValue({
      metricsView: {
        dataViewReference: {
          id: 'test-data-view',
          getFieldByName: jest.fn().mockReturnValue({ name: 'host.name', type: 'string' }),
        },
      },
    } as unknown as ReturnType<typeof useMetricsDataViewContext>);

    mockUseAfterLoadedState.mockReturnValue({
      afterLoadedState: {
        dateRange: { from: 'now-15m', to: 'now' },
        filters: [],
        query: undefined,
        reloadRequestTime: 0,
        getSubtitle: jest.fn(),
      },
    } as unknown as ReturnType<typeof useAfterLoadedStateHooks.useAfterLoadedState>);
  });

  describe('when there is an error', () => {
    it('should render ChartPlaceholder with error state', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: false,
        error: { message: 'API error' },
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      // ChartPlaceholder renders 4 length placeholder panels
      expect(screen.getAllByText('API error')).toHaveLength(4);
      expect(screen.queryByTestId('hostKpiCharts')).not.toBeInTheDocument();
    });

    it('should render ChartPlaceholder when error exists even with hosts', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [{ name: 'host-1' }, { name: 'host-2' }],
        loading: false,
        error: { message: 'API error' },
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      expect(screen.getAllByText('API error')).toHaveLength(4);
      expect(screen.queryByTestId('hostKpiCharts')).not.toBeInTheDocument();
    });
  });

  describe('when there is no data', () => {
    it('should render ChartPlaceholder when not loading and no hosts', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: false,
        error: undefined,
      });

      renderKpiCharts();

      expect(screen.getAllByText('No results found')).toHaveLength(4);
      expect(screen.queryByTestId('hostKpiCharts')).not.toBeInTheDocument();
    });
  });

  describe('when loading', () => {
    it('should render HostKpiCharts when loading even with no hosts', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: true,
        error: undefined,
      });

      renderKpiCharts();

      expect(screen.getByTestId('hostKpiCharts')).toBeInTheDocument();
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    });
  });

  describe('when data is available', () => {
    it('should render HostKpiCharts when hosts are loaded successfully', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [{ name: 'host-1' }, { name: 'host-2' }],
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      expect(screen.getByTestId('hostKpiCharts')).toBeInTheDocument();
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    });
  });
});
