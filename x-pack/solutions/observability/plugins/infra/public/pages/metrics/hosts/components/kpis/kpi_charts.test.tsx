/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { getMetricDataAvailability, KpiCharts } from './kpi_charts';
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

// The Lens path renders one `<Kpi>` per chart via the local `KpiCell`
// wrapper. We stub `<Kpi>` so the tests don't have to pull in the full
// Lens embeddable + data plugin stack; instead, the mock just renders the
// per-tile id and `valueOverride` so we can assert against them.
jest.mock('../../../../../components/asset_details/components/kpis/kpi', () => ({
  Kpi: ({ id, valueOverride }: { id: string; valueOverride?: number }) => (
    <div data-test-subj={`mockKpi-${id}`} data-value-override={String(valueOverride)}>
      Kpi:{id}
    </div>
  ),
}));

// `useHostKpiCharts` resolves indexes / formulas async on a real run; we
// short-circuit it to a stable four-tile catalogue so the assertion
// surface stays focused on the `metricDataAvailability` plumbing.
jest.mock('../../../../../components/asset_details/hooks/use_host_metrics_charts', () => ({
  useHostKpiCharts: () => [
    { id: 'cpuUsage' },
    { id: 'normalizedLoad1m' },
    { id: 'memoryUsage' },
    { id: 'diskUsage' },
  ],
}));

// The PoC switch — pin to the Lens path so the assertions below exercise
// `LensKpiCharts`. The P15b (`useEsqlEndpointKpi: true`) branch has its
// own component (`HostKpiTiles`) and is covered elsewhere.
jest.mock('../../hooks/use_poc_settings', () => ({
  usePocSettingsContext: () => ({
    useEsqlEndpointKpi: false,
    useLensEsqlKpiCharts: false,
    kpiTrendline: true,
  }),
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

    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: {
        dateRange: { from: 'now-15m', to: 'now' },
        filters: [],
        panelFilters: [],
        query: { query: '', language: 'kuery' },
        limit: 100,
        preferredSchema: 'ecs',
      },
      parsedDateRange: { from: 'now-15m', to: 'now' },
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
          getIndexPattern: jest.fn().mockReturnValue('metrics-*'),
        },
      },
    } as unknown as ReturnType<typeof useMetricsDataViewContext>);

    // `useAfterLoadedState` forwards the inbound payload once the page has
    // settled. We mirror the production behaviour: the resolved `charts`
    // travel back unchanged so the per-tile loop renders four `<Kpi>`s.
    mockUseAfterLoadedState.mockImplementation((_loading, input) => ({
      afterLoadedState: input,
    }));
  });

  describe('when there is an error', () => {
    it('renders ChartPlaceholder panels with the error message in place of the Kpi tiles', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: false,
        error: { message: 'API error' },
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      expect(screen.getAllByText('API error')).toHaveLength(4);
      expect(screen.queryByTestId('mockKpi-cpuUsage')).not.toBeInTheDocument();
    });

    it('renders ChartPlaceholder when error exists even with hosts', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [{ name: 'host-1' }, { name: 'host-2' }],
        loading: false,
        error: { message: 'API error' },
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      expect(screen.getAllByText('API error')).toHaveLength(4);
      expect(screen.queryByTestId('mockKpi-cpuUsage')).not.toBeInTheDocument();
    });
  });

  describe('when there is no data', () => {
    it('renders the "No results found" placeholder when not loading and no hosts', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      expect(screen.getAllByText('No results found')).toHaveLength(4);
      expect(screen.queryByTestId('mockKpi-cpuUsage')).not.toBeInTheDocument();
    });
  });

  describe('when loading', () => {
    it('renders the Kpi tiles even with no hosts so the loading state stays visible', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [],
        loading: true,
        error: undefined,
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      expect(screen.getByTestId('mockKpi-cpuUsage')).toBeInTheDocument();
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    });
  });

  describe('when data is available', () => {
    it('renders the four Kpi tiles when hosts are loaded successfully', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [
          {
            name: 'host-1',
            metrics: [
              { name: 'cpuV2', value: 0.5 },
              { name: 'normalizedLoad1m', value: 1 },
              { name: 'memory', value: 0.75 },
              { name: 'diskSpaceUsage', value: 0.25 },
            ],
            metadata: [],
            hasSystemMetrics: true,
          },
        ],
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      expect(screen.getByTestId('mockKpi-cpuUsage')).toBeInTheDocument();
      expect(screen.getByTestId('mockKpi-normalizedLoad1m')).toBeInTheDocument();
      expect(screen.getByTestId('mockKpi-memoryUsage')).toBeInTheDocument();
      expect(screen.getByTestId('mockKpi-diskUsage')).toBeInTheDocument();
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    });

    it('passes valueOverride=NaN for KPIs whose backing metric is null on every host', () => {
      mockUseHostsViewContext.mockReturnValue({
        hostNodes: [
          {
            name: 'host-1',
            metrics: [
              { name: 'cpuV2', value: null },
              { name: 'normalizedLoad1m', value: 0 },
              { name: 'memory', value: null },
              { name: 'diskSpaceUsage', value: null },
            ],
            metadata: [],
            hasSystemMetrics: false,
          },
        ],
        loading: false,
        error: undefined,
      } as unknown as ReturnType<typeof useHostsViewContext>);

      renderKpiCharts();

      // `normalizedLoad1m` has a (zero) value across the visible hosts, so
      // no override is passed. The other three KPIs have only nulls, so
      // each tile receives `NaN` and the `<Kpi>` mock surfaces it via
      // `data-value-override`.
      expect(screen.getByTestId('mockKpi-cpuUsage').getAttribute('data-value-override')).toBe(
        'NaN'
      );
      expect(
        screen.getByTestId('mockKpi-normalizedLoad1m').getAttribute('data-value-override')
      ).toBe('undefined');
      expect(screen.getByTestId('mockKpi-memoryUsage').getAttribute('data-value-override')).toBe(
        'NaN'
      );
      expect(screen.getByTestId('mockKpi-diskUsage').getAttribute('data-value-override')).toBe(
        'NaN'
      );
    });
  });

  describe('getMetricDataAvailability', () => {
    it('preserves zero values as available metric data', () => {
      expect(
        getMetricDataAvailability([
          {
            name: 'host-1',
            metrics: [
              { name: 'cpuV2', value: 0 },
              { name: 'normalizedLoad1m', value: null },
              { name: 'memory', value: null },
              { name: 'diskSpaceUsage', value: null },
            ],
            metadata: [],
            hasSystemMetrics: true,
          },
        ])
      ).toEqual({
        cpuUsage: true,
        normalizedLoad1m: false,
        memoryUsage: false,
        diskUsage: false,
      });
    });

    it('marks a KPI as available when any selected host has that metric', () => {
      expect(
        getMetricDataAvailability([
          {
            name: 'host-with-cpu',
            metrics: [
              { name: 'cpuV2', value: 0.5 },
              { name: 'normalizedLoad1m', value: 1 },
              { name: 'memory', value: 0.75 },
              { name: 'diskSpaceUsage', value: 0.25 },
            ],
            metadata: [],
            hasSystemMetrics: true,
          },
          {
            name: 'host-without-cpu',
            metrics: [
              { name: 'cpuV2', value: null },
              { name: 'normalizedLoad1m', value: 1 },
              { name: 'memory', value: 0.75 },
              { name: 'diskSpaceUsage', value: 0.25 },
            ],
            metadata: [],
            hasSystemMetrics: true,
          },
        ])
      ).toEqual({
        cpuUsage: true,
        normalizedLoad1m: true,
        memoryUsage: true,
        diskUsage: true,
      });
    });
  });
});
