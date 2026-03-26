/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { LEGACY_LIGHT_THEME, Partition, Settings } from '@elastic/charts';
import { parsedMockAlertsData } from '../../../overview/components/detection_response/alerts_by_status/mock_data';
import { render } from '@testing-library/react';
import type { DonutChartProps } from './donutchart';
import { DonutChart } from './donutchart';
import { DraggableLegend } from './draggable_legend';
import { ChartLabel } from '../../../overview/components/detection_response/alerts_by_status/chart_label';

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Chart: jest.fn(({ children, ...props }) => (
      <div data-test-subj="es-chart" {...props}>
        {children}
      </div>
    )),
    Partition: jest.fn((props) => <div data-test-subj="es-chart-partition" {...props} />),
    Settings: jest.fn((props) => <div data-test-subj="es-chart-settings" {...props} />),
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

jest.mock('../../../overview/components/detection_response/alerts_by_status/chart_label', () => {
  return {
    ChartLabel: jest.fn((props) => <span data-test-subj="chart-label" {...props} />),
  };
});

jest.mock('./draggable_legend', () => {
  return {
    DraggableLegend: jest.fn((props) => <span data-test-subj="draggable-legend" {...props} />),
  };
});

const mockBaseTheme = LEGACY_LIGHT_THEME;
jest.mock('./common', () => {
  return {
    useThemes: jest.fn(() => ({
      baseTheme: mockBaseTheme,
      theme: {},
    })),
  };
});

const testColors = {
  critical: '#EF6550',
  high: '#EE9266',
  medium: '#F3B689',
  low: '#F8D9B2',
};

describe('DonutChart', () => {
  const props: DonutChartProps = {
    data: parsedMockAlertsData?.open?.severities,
    label: 'Open',
    title: <ChartLabel count={parsedMockAlertsData?.open?.total} />,
    fillColor: jest.fn(() => '#ccc'),
    totalCount: parsedMockAlertsData?.open?.total,
    legendItems: (['critical', 'high', 'medium', 'low'] as Severity[]).map((d) => ({
      color: testColors[d],
      scopeId: undefined,
      field: 'kibana.alert.severity',
      value: d,
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should render Chart', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="es-chart"]`)).toBeInTheDocument();
  });

  test('should render chart Settings', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="es-chart-settings"]`)).toBeInTheDocument();

    const settingsProps = (Settings as jest.Mock).mock.calls[0][0];
    expect(settingsProps.baseTheme).toEqual(LEGACY_LIGHT_THEME);
    expect(settingsProps.theme[0]).toEqual({
      chartMargins: { bottom: 0, left: 0, right: 0, top: 0 },
      partition: {
        circlePadding: 4,
        emptySizeRatio: 0.8,
        idealFontSizeJump: 1.1,
        outerSizeRatio: 1,
      },
    });
    expect(settingsProps.onElementClick).toBeInstanceOf(Function);
  });

  test('should render an empty chart', () => {
    const testProps = {
      ...props,
      data: parsedMockAlertsData?.acknowledged?.severities,
      label: 'Acknowledged',
      title: <ChartLabel count={parsedMockAlertsData?.acknowledged?.total} />,
      totalCount: parsedMockAlertsData?.acknowledged?.total,
    };
    const { container } = render(<DonutChart {...testProps} />);
    expect(container.querySelector(`[data-test-subj="empty-donut"]`)).toBeInTheDocument();
  });

  test('should render chart Partition', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="es-chart-partition"]`)).toBeInTheDocument();
    expect((Partition as jest.Mock).mock.calls[0][0].data).toEqual(
      parsedMockAlertsData?.open?.severities
    );
    expect((Partition as jest.Mock).mock.calls[0][0].layout).toEqual('sunburst');
  });

  test('should render chart legend', () => {
    const { container } = render(<DonutChart {...props} />);
    expect(container.querySelector(`[data-test-subj="draggable-legend"]`)).toBeInTheDocument();
    expect((DraggableLegend as unknown as jest.Mock).mock.calls[0][0].legendItems).toEqual([
      {
        color: '#EF6550',
        field: 'kibana.alert.severity',
        scopeId: undefined,
        value: 'critical',
      },
      {
        color: '#EE9266',
        field: 'kibana.alert.severity',
        scopeId: undefined,
        value: 'high',
      },
      {
        color: '#F3B689',
        field: 'kibana.alert.severity',
        scopeId: undefined,
        value: 'medium',
      },
      {
        color: '#F8D9B2',
        field: 'kibana.alert.severity',
        scopeId: undefined,
        value: 'low',
      },
    ]);
  });

  test('should NOT render chart legend if showLegend is false', () => {
    const testProps = {
      ...props,
      legendItems: null,
    };
    const { container } = render(<DonutChart {...testProps} />);
    expect(container.querySelector(`[data-test-subj="legend"]`)).not.toBeInTheDocument();
  });

  test('should render label within a tooltip', () => {
    const { container } = render(<DonutChart {...props} />);
    const tooltip = container.getElementsByClassName('euiToolTipAnchor')[0];
    expect(tooltip.textContent).toBe(props.label);
  });
});
