/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MetricsGrid } from './metrics_grid';
import { useMetricsCharts } from '../../../hooks/use_metrics_charts';
import { useMetricsDataViewContext } from '../../../../../../containers/metrics_source';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

vi.mock('../../../hooks/use_metrics_charts');
vi.mock('../../../hooks/use_unified_search');
vi.mock('../../../../../../containers/metrics_source');
vi.mock('../../../../../../components/lens', () => {
      const mocked = {
      HostMetricsExplanationContent: () => <div data-test-subj="hostMetricsExplanation" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./chart', () => {
      const mocked = {
      Chart: ({ id }: { id: string }) => <div data-test-subj={`hostsView-metricChart-${id}`} />,
    };
      return { ...mocked, default: mocked };
    });

const mockUseMetricsCharts = useMetricsCharts as MockedFunction<typeof useMetricsCharts>;
const mockUseMetricsDataViewContext = useMetricsDataViewContext as MockedFunction<
  typeof useMetricsDataViewContext
>;
const mockUseUnifiedSearchContext = useUnifiedSearchContext as MockedFunction<
  typeof useUnifiedSearchContext
>;

const CHART_IDS = [
  'cpuUsage',
  'normalizedLoad1m',
  'memoryUsage',
  'memoryFree',
  'diskSpaceAvailable',
  'diskIORead',
  'diskIOWrite',
  'diskReadThroughput',
  'diskWriteThroughput',
  'rx',
  'tx',
] as const;

const mockDataView = {
  id: 'metrics-data-view',
  getIndexPattern: () => 'metrics-*',
};

describe('MetricsGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseMetricsDataViewContext.mockReturnValue({
      metricsView: { dataViewReference: mockDataView },
    } as unknown as ReturnType<typeof useMetricsDataViewContext>);

    mockUseUnifiedSearchContext.mockReturnValue({
      searchCriteria: { preferredSchema: 'ecs' },
    } as unknown as ReturnType<typeof useUnifiedSearchContext>);

    mockUseMetricsCharts.mockReturnValue(
      CHART_IDS.map((id) => ({
        id,
        chartType: 'xy',
        title: id,
        layers: [],
      })) as ReturnType<typeof useMetricsCharts>
    );
  });

  it('renders one Lens chart for each hosts metrics chart', () => {
    render(
      <I18nProvider>
        <MetricsGrid />
      </I18nProvider>
    );

    expect(mockUseMetricsCharts).toHaveBeenCalledWith({
      indexPattern: 'metrics-*',
      schema: 'ecs',
    });
    expect(screen.getByTestId('hostsView-metricChart')).toBeInTheDocument();

    for (const id of CHART_IDS) {
      expect(screen.getByTestId(`hostsView-metricChart-${id}`)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId(/hostsView-metricChart-/)).toHaveLength(CHART_IDS.length);
  });
});
