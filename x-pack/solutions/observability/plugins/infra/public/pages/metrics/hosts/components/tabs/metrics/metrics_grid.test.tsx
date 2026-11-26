/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MetricsGrid } from './metrics_grid';
import { useMetricsCharts } from '../../../hooks/use_metrics_charts';
import { useMetricsDataViewContext } from '../../../../../../containers/metrics_source';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

jest.mock('../../../hooks/use_metrics_charts');
jest.mock('../../../hooks/use_unified_search');
jest.mock('../../../../../../containers/metrics_source');
jest.mock('../../../../../../components/lens', () => ({
  HostMetricsExplanationContent: () => <div data-test-subj="hostMetricsExplanation" />,
}));
jest.mock('./chart', () => ({
  Chart: ({ id }: { id: string }) => <div data-test-subj={`hostsView-metricChart-${id}`} />,
}));

const mockUseMetricsCharts = useMetricsCharts as jest.MockedFunction<typeof useMetricsCharts>;
const mockUseMetricsDataViewContext = useMetricsDataViewContext as jest.MockedFunction<
  typeof useMetricsDataViewContext
>;
const mockUseUnifiedSearchContext = useUnifiedSearchContext as jest.MockedFunction<
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
    jest.clearAllMocks();

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
