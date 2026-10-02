/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider, useResizeObserver } from '@elastic/eui';
import { AreaSeries, Axis, Settings } from '@elastic/charts';
import type { PointStyleAccessor } from '@elastic/charts';
import { TrendSparkline } from './trend_sparkline';

// jsdom has no canvas or ResizeObserver; what this component owns is the geometry it hands
// the chart (domains, endpoint styling, untouched data), so the chart stands in as its props.
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Chart: jest.fn(({ children }) => <div data-test-subj="chart-mock">{children}</div>),
    Settings: jest.fn(() => null),
    Tooltip: jest.fn(() => null),
    Axis: jest.fn(() => null),
    AreaSeries: jest.fn(() => null),
  };
});

const mockObservedWidth = { width: 0, height: 0 };
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useResizeObserver: jest.fn(() => mockObservedWidth),
  };
});

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('../../hooks/use_kibana_time_zone', () => ({ useKibanaTimeZone: () => 'UTC' }));

const mockedUseResizeObserver = useResizeObserver as jest.MockedFunction<typeof useResizeObserver>;
const MockedSettings = Settings as jest.MockedFunction<typeof Settings>;
const MockedAxis = Axis as jest.MockedFunction<typeof Axis>;
const MockedAreaSeries = AreaSeries as jest.MockedFunction<typeof AreaSeries>;

const series = [
  { x: 1_700_000_000_000, y: 1 },
  { x: 1_700_001_800_000, y: 4 },
  { x: 1_700_003_600_000, y: 2 },
];

const renderSparkline = (yMax = 5) =>
  render(
    <EuiProvider>
      <TrendSparkline
        series={series}
        color="#61A2FF"
        ariaLabel="Configure: 2 open proposals over the last 24 hours"
        panelId="configure"
        seriesName="Configure actions"
        bucketMinutes={30}
        yMax={yMax}
      />
    </EuiProvider>
  );

describe('TrendSparkline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObservedWidth.width = 300;
  });

  it('should not mount the chart until the wrapper has a measured width', () => {
    mockObservedWidth.width = 0;
    renderSparkline();
    expect(screen.queryByTestId('chart-mock')).not.toBeInTheDocument();
    expect(
      screen.getByText('Configure: 2 open proposals over the last 24 hours')
    ).toBeInTheDocument();
  });

  it('should mount the chart once a width is observed', () => {
    renderSparkline();
    expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
  });

  it('should observe the wrapper element and reveal the chart when its width arrives', () => {
    // First paint: nothing measured yet. The observer must already be attached to the
    // rendered wrapper (not to a null ref) so the first measurement can reveal the chart.
    mockObservedWidth.width = 0;
    const { rerender } = renderSparkline();
    expect(screen.queryByTestId('chart-mock')).not.toBeInTheDocument();
    expect(mockedUseResizeObserver).toHaveBeenLastCalledWith(expect.any(HTMLDivElement), 'width');

    // The observer reports a size for the same mounted sparkline; no remount.
    mockObservedWidth.width = 300;
    rerender(
      <EuiProvider>
        <TrendSparkline
          series={series}
          color="#61A2FF"
          ariaLabel="Configure: 2 open proposals over the last 24 hours"
          panelId="configure"
          seriesName="Configure actions"
          bucketMinutes={30}
          yMax={5}
        />
      </EuiProvider>
    );
    expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
  });

  it('should pass the data through untouched and scale to the shared peak', () => {
    renderSparkline(9);

    const areaProps = MockedAreaSeries.mock.calls[0][0];
    expect(areaProps.data).toBe(series);
    expect(areaProps.yAccessors).toEqual(['y']);

    const axisProps = MockedAxis.mock.calls[0][0];
    const domain = axisProps.domain as { min: number; max: number };
    // Zero is lifted off the floor; the peak keeps headroom for the end dot.
    expect(domain.min).toBeLessThan(0);
    expect(domain.max).toBeGreaterThan(9);
  });

  it('should extend the x axis past the last bucket instead of adding a point', () => {
    renderSparkline();

    const settingsProps = MockedSettings.mock.calls[0][0];
    const xDomain = settingsProps.xDomain as { min: number; max: number };
    expect(xDomain.min).toBe(series[0].x);
    expect(xDomain.max).toBeGreaterThan(series[series.length - 1].x);
    expect(MockedAreaSeries.mock.calls[0][0].data).toHaveLength(series.length);
  });

  it('should draw a dot only on the current value', () => {
    renderSparkline();

    const accessor = MockedAreaSeries.mock.calls[0][0].pointStyleAccessor as PointStyleAccessor;
    const seriesIdentifier = { specId: 'configure', key: 'configure' } as never;
    const datum = { x: series[2].x, y: series[2].y } as never;
    const lastStyle = accessor(datum, seriesIdentifier, false);
    expect(lastStyle).toEqual(expect.objectContaining({ radius: 3 }));

    const earlier = { x: series[0].x, y: series[0].y } as never;
    expect(accessor(earlier, seriesIdentifier, false)).toBeNull();
  });
});
