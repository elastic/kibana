/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KpiCharts } from './kpi_charts';
import type { HostsKpis } from '../../hooks/use_hosts_kpis_esql';

const mockUseHostsKpis = jest.fn();
const mockUseHostCountContext = jest.fn();
const mockUseUnifiedSearchContext = jest.fn();

jest.mock('../../hooks/use_hosts_kpis_esql', () => ({
  useHostsKpisEsql: () => mockUseHostsKpis(),
}));
jest.mock('../../hooks/use_host_count', () => ({
  useHostCountContext: () => mockUseHostCountContext(),
}));
jest.mock('../../hooks/use_unified_search', () => ({
  useUnifiedSearchContext: () => mockUseUnifiedSearchContext(),
}));

// Must be a stable singleton: `KpiCharts` passes `inventoryModel.metrics` into
// a `useAsync` dep array, so a fresh object per call would loop re-renders.
// Disk usage is schema-dependent (ECS `max(...)` vs semconv `1 - sum/sum`).
const mockInventoryModel = {
  metrics: {
    getFormulas: async (args?: { schema?: string }) =>
      new Map([
        ['cpuUsage', { format: 'percent', value: 'avg(cpu)' }],
        ['normalizedLoad1m', { format: 'number', value: 'avg(load)' }],
        ['memoryUsage', { format: 'percent', value: 'avg(mem)' }],
        [
          'diskUsage',
          args?.schema === 'ecs'
            ? { format: 'percent', value: 'max(system.filesystem.used.pct)' }
            : { format: 'percent', value: '1 - sum(free) / sum(total)' },
        ],
      ]),
  },
};
jest.mock('@kbn/metrics-data-access-plugin/common', () => ({
  findInventoryModel: () => mockInventoryModel,
  CPU_USAGE_LABEL: 'CPU Usage',
  MEMORY_USAGE_LABEL: 'Memory Usage',
  NORMALIZED_LOAD_LABEL: 'Normalized Load',
  DISK_USAGE_LABEL: 'Disk Usage',
}));

jest.mock('../../../../../components/lens', () => ({
  TooltipContent: () => <div data-test-subj="tooltip" />,
}));

jest.mock('../chart/metric_chart_wrapper', () => ({
  MetricChartWrapper: ({
    id,
    value,
    valueFormatter,
    subtitle,
  }: {
    id: string;
    value: number | null;
    valueFormatter?: (value: number) => string;
    subtitle: string;
  }) => (
    <div
      data-test-subj={id}
      data-value={String(value)}
      data-formatted={value == null ? '' : valueFormatter?.(value)}
      data-subtitle={subtitle}
    />
  ),
}));

const KPIS: HostsKpis = {
  cpuUsage: 0.4567,
  normalizedLoad1m: 1.234,
  memoryUsage: 0.5,
  diskUsage: null,
};

const renderKpiCharts = () =>
  render(
    <I18nProvider>
      <KpiCharts />
    </I18nProvider>
  );

describe('KpiCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseHostsKpis.mockReturnValue({ kpis: KPIS, loading: false, error: null });
    mockUseHostCountContext.mockReturnValue({ loading: false, count: 10 });
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: { preferredSchema: 'semconv', limit: 100 },
    });
  });

  it('renders the four KPI tiles from the ES|QL KPI query', async () => {
    renderKpiCharts();

    await waitFor(() => {
      expect(screen.getByTestId('hostsViewKPI-cpuUsage')).toBeInTheDocument();
    });
    expect(screen.getByTestId('hostsViewKPI-normalizedLoad1m')).toBeInTheDocument();
    expect(screen.getByTestId('hostsViewKPI-memoryUsage')).toBeInTheDocument();
    expect(screen.getByTestId('hostsViewKPI-diskUsage')).toBeInTheDocument();
  });

  it('formats percent tiles with one decimal and passes null values through untouched', async () => {
    renderKpiCharts();

    await waitFor(() => {
      expect(screen.getByTestId('hostsViewKPI-cpuUsage')).toHaveAttribute(
        'data-formatted',
        '45.7%'
      );
    });
    expect(screen.getByTestId('hostsViewKPI-normalizedLoad1m')).toHaveAttribute(
      'data-formatted',
      '1.2'
    );
    // Null is forwarded as-is so the tile renders "–" rather than `0%`.
    expect(screen.getByTestId('hostsViewKPI-diskUsage')).toHaveAttribute('data-value', 'null');
  });

  it('subtitles avg tiles "Average (of N hosts)" pegged to min(hostCount, limit) and leaves the semconv disk ratio blank', async () => {
    mockUseHostCountContext.mockReturnValue({ loading: false, count: 250 });
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: { preferredSchema: 'semconv', limit: 100 },
    });

    renderKpiCharts();

    await waitFor(() => {
      expect(screen.getByTestId('hostsViewKPI-cpuUsage')).toHaveAttribute(
        'data-subtitle',
        'Average (of 100 hosts)'
      );
    });
    expect(screen.getByTestId('hostsViewKPI-diskUsage')).toHaveAttribute('data-subtitle', '');
  });

  it('subtitles the ECS disk tile "Max (of N hosts)" (mirrors its `max(...)` formula)', async () => {
    mockUseHostCountContext.mockReturnValue({ loading: false, count: 250 });
    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: { preferredSchema: 'ecs', limit: 100 },
    });

    renderKpiCharts();

    await waitFor(() => {
      expect(screen.getByTestId('hostsViewKPI-diskUsage')).toHaveAttribute(
        'data-subtitle',
        'Max (of 100 hosts)'
      );
    });
    expect(screen.getByTestId('hostsViewKPI-cpuUsage')).toHaveAttribute(
      'data-subtitle',
      'Average (of 100 hosts)'
    );
  });

  it('surfaces a distinct subtitle when the KPI query fails', async () => {
    mockUseHostsKpis.mockReturnValue({
      kpis: { cpuUsage: null, normalizedLoad1m: null, memoryUsage: null, diskUsage: null },
      loading: false,
      error: new Error('boom'),
    });

    renderKpiCharts();

    await waitFor(() => {
      expect(screen.getByTestId('hostsViewKPI-cpuUsage')).toHaveAttribute(
        'data-subtitle',
        'Unable to load'
      );
    });
  });
});
