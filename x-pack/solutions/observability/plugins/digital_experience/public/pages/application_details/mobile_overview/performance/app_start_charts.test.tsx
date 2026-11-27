/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { LineSeriesProps, TooltipProps } from '@elastic/charts';
import type { MobileAppStartPoint } from '../../../../../common/types/mobile';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { AppStartChart } from './app_start_charts';

const mockLines: LineSeriesProps[] = [];
const mockTooltips: TooltipProps[] = [];

// jsdom draws no canvas, so the test reads the series and tooltip the chart is given.
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    LineSeries: (props: LineSeriesProps) => {
      mockLines.push(props);
      return null;
    },
    Tooltip: (props: TooltipProps) => {
      mockTooltips.push(props);
      return null;
    },
  };
});

jest.mock('../../../../hooks/use_kibana_services');

const HOUR = 3_600_000;
const NONE = { avg: null, count: 0 };

const POINTS: MobileAppStartPoint[] = [
  { timestamp: 0, cold: { avg: 1800, count: 42 }, warm: { avg: 350, count: 7 } },
  // No starts in the bucket
  { timestamp: HOUR, cold: NONE, warm: NONE },
  { timestamp: 2 * HOUR, cold: { avg: 2100, count: 1 }, warm: NONE },
];

const renderChart = (type: 'cold' | 'warm', points = POINTS) =>
  render(
    <AppStartChart
      type={type}
      points={points}
      histogram={{ interval: { value: 3600, unit: 's' }, start: 0, end: 3 * HOUR }}
      onTimeRangeSelect={jest.fn()}
    />,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>{children}</EuiProvider>
        </I18nProvider>
      ),
    }
  );

beforeEach(() => {
  mockLines.length = 0;
  mockTooltips.length = 0;
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('AppStartChart', () => {
  it('draws one point per bucket of the start type, a gap where the bucket had none', () => {
    renderChart('cold');

    const [line] = mockLines;
    expect(line.name).toBe('Avg. cold start');
    expect(line.data).toEqual([
      { timestamp: 0, avg: 1800, count: 42 },
      { timestamp: HOUR, avg: null, count: 0 },
      { timestamp: 2 * HOUR, avg: 2100, count: 1 },
    ]);
  });

  it('reads the warm starts for the warm chart', () => {
    renderChart('warm');

    expect(mockLines[0].data.map((datum) => (datum as { avg: number | null }).avg)).toEqual([
      350,
      null,
      null,
    ]);
  });

  it("shows the bucket's starts in the tooltip", () => {
    renderChart('cold');

    const Footer = mockTooltips.at(-1)?.footer as React.ComponentType<{
      items: Array<{ datum: { count: number } }>;
      header: null;
    }>;
    render(<Footer items={[{ datum: { count: 42 } }]} header={null} />, {
      wrapper: I18nProvider,
    });
    expect(screen.getByTestId('digitalExperienceMobileAppStartCount')).toHaveTextContent(
      '42 cold starts'
    );
  });

  it('says no start of the type counts when no bucket has any, whatever the other type has', () => {
    renderChart('warm', [{ timestamp: 0, cold: { avg: 1800, count: 42 }, warm: NONE }]);

    expect(
      screen.getByText('No warm starts of 60 seconds or less in the time range and filters.')
    ).toBeInTheDocument();
  });
});
