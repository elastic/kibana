/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { StreamsMetricTiles } from './streams_metric_tiles';

type MetricDataEntry = Array<{
  subtitle: string;
  value: number;
  valueFormatter: (n: number) => string;
  domainMax: number;
  progressBarDirection: string;
  background: string;
  color: string;
  extra?: { value: string };
}>;

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="mock-chart">{children}</div>
  ),
  Settings: () => null,
  Metric: ({ data }: { data: MetricDataEntry[] }) => {
    const formatted = data[0]?.map((d) => ({
      ...d,
      formattedValue: d.valueFormatter(d.value),
    }));
    return <div data-test-subj="mock-metric">{JSON.stringify(formatted)}</div>;
  },
  LayoutDirection: { Vertical: 'vertical' },
  LIGHT_THEME: {},
}));

describe('StreamsMetricTiles', () => {
  it('renders with default metrics', () => {
    const { container } = render(<StreamsMetricTiles />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewStreamsMetricTiles"]')
    ).toBeInTheDocument();
  });

  it('renders with custom metrics', () => {
    const customMetrics = [
      {
        subtitle: 'logs.custom.error',
        value: 5000,
        domainMax: 10000,
        extra: { value: '+50%' },
      },
    ];
    const { container } = render(<StreamsMetricTiles metrics={customMetrics} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewStreamsMetricTiles"]')
    ).toBeInTheDocument();
  });

  it('applies custom height', () => {
    const { container } = render(<StreamsMetricTiles height={200} />);
    const element = container.querySelector('.sigeventsOverviewStreamsMetricTiles');
    expect(element).toBeInTheDocument();
  });

  it('renders the Chart component', () => {
    const { getByTestId } = render(<StreamsMetricTiles />);
    expect(getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('renders the Metric component with data', () => {
    const { getByTestId } = render(<StreamsMetricTiles />);
    expect(getByTestId('mock-metric')).toBeInTheDocument();
  });

  it('formats values using locale string', () => {
    const { getByTestId } = render(<StreamsMetricTiles />);
    const metricContent = getByTestId('mock-metric').textContent;
    expect(metricContent).toContain('128,400');
    expect(metricContent).toContain('48,200');
  });
});
