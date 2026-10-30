/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { BrushEndListener, SettingsProps } from '@elastic/charts';
import type { OverviewTrendPoint } from '../../../../../common/types/overview';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { OverviewTrends } from './overview_trends';

const mockBrushEndListeners: BrushEndListener[] = [];

// jsdom draws no canvas to drag over, so the test calls the listener each chart registers.
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    Settings: (props: SettingsProps) => {
      if (props.onBrushEnd) {
        mockBrushEndListeners.push(props.onBrushEnd);
      }
      return createElement(actual.Settings, props);
    },
  };
});

jest.mock('../../../../hooks/use_kibana_services');

const POINTS: OverviewTrendPoint[] = [
  { timestamp: 1_000, pageLoads: 2, loadTimeP75Ms: 1500.5 },
  { timestamp: 2_000, pageLoads: 0, loadTimeP75Ms: null },
];

const renderTrends = (
  points: OverviewTrendPoint[] = POINTS,
  isLoading = false,
  onTimeRangeSelect = jest.fn()
) =>
  render(
    <OverviewTrends
      points={points}
      pageLoads={points.reduce((sum, { pageLoads }) => sum + pageLoads, 0)}
      loadTimeP75Ms={1500.5}
      isLoading={isLoading}
      onTimeRangeSelect={onTimeRangeSelect}
    />,
    { wrapper: EuiProvider }
  );

const pageLoadsChart = () => screen.getByTestId('digitalExperienceOverviewPageLoadsTrend');
const loadTimeChart = () => screen.getByTestId('digitalExperienceOverviewLoadTimeTrend');

const NO_DATA_MESSAGE = 'No page loads in the selected time range';
const NO_LOAD_TIMES_MESSAGE = 'No page load reported a load time in the selected time range';

// The chart renders as an accessible graphics document, whose canvas jsdom does not draw.
const hasChart = (panel: HTMLElement) => within(panel).queryByRole('graphics-document') !== null;

beforeEach(() => {
  mockBrushEndListeners.length = 0;
  window.localStorage.clear();
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('OverviewTrends', () => {
  it('draws the page loads and the load time on the buckets of the response', () => {
    renderTrends();

    expect(hasChart(pageLoadsChart())).toBe(true);
    expect(hasChart(loadTimeChart())).toBe(true);
  });

  it('shows the page loads and the load time of the whole range above their charts', () => {
    renderTrends();

    expect(pageLoadsChart()).toHaveTextContent('Page loads2');
    expect(loadTimeChart()).toHaveTextContent('Load time (p75)1.50 s');
  });

  it('says when there are no page loads in the time range', () => {
    renderTrends([{ timestamp: 1_000, pageLoads: 0, loadTimeP75Ms: null }]);

    expect(within(pageLoadsChart()).getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    expect(within(loadTimeChart()).getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('draws the page loads even when nothing was timed, and says no load time was reported', () => {
    renderTrends([{ timestamp: 1_000, pageLoads: 3, loadTimeP75Ms: null }]);

    expect(hasChart(pageLoadsChart())).toBe(true);
    expect(within(loadTimeChart()).getByText(NO_LOAD_TIMES_MESSAGE)).toBeInTheDocument();
    expect(within(loadTimeChart()).queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('selects the range dragged over a chart', () => {
    const onTimeRangeSelect = jest.fn();
    renderTrends(POINTS, false, onTimeRangeSelect);

    mockBrushEndListeners[0]({ x: [1_000, 2_000] });

    expect(onTimeRangeSelect).toHaveBeenCalledWith({
      rangeFrom: '1970-01-01T00:00:01.000Z',
      rangeTo: '1970-01-01T00:00:02.000Z',
    });
  });

  it('draws areas by default and keeps the chart type the user picks', () => {
    const { unmount } = renderTrends();
    expect(screen.getByRole('button', { name: 'Area' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Bar' }));
    expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
    unmount();

    renderTrends();
    expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the loading state of both charts, not their values or empty message', () => {
    renderTrends([], true);

    expect(screen.queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText('1.50 s')).not.toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });
});
