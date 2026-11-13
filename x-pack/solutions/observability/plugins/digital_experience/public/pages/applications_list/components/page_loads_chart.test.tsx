/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { RectAnnotationProps } from '@elastic/charts';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { PageLoadsChart } from './page_loads_chart';

const STORAGE_KEY = 'xpack.digitalExperience.applications.chartMetric';

// No bucket has a count, so the chart shows its empty message, which says which metric it is of.
const NO_COUNTS = [{ timestamp: 0, count: 0 }];

const HOUR = 60 * 60 * 1000;
// Hourly buckets with page loads; the default range matches their edges.
const HOURLY_COUNTS = [0, HOUR, 2 * HOUR].map((timestamp) => ({ timestamp, count: 4 }));

const renderChart = ({
  pageLoads = NO_COUNTS,
  sessions = NO_COUNTS as typeof NO_COUNTS | null,
  isLoading = false,
  range = { start: 0, end: 3 * HOUR },
}: Partial<
  Pick<Parameters<typeof PageLoadsChart>[0], 'pageLoads' | 'sessions' | 'isLoading' | 'range'>
> = {}) =>
  render(
    <PageLoadsChart
      pageLoads={pageLoads}
      sessions={sessions}
      interval={{ value: 3600, unit: 's' }}
      range={range}
      isLoading={isLoading}
      onTimeRangeSelect={jest.fn()}
    />,
    { wrapper: EuiProvider }
  );

const storeChoice = (value: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
const storedChoice = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

const title = (name: 'Page loads' | 'Sessions') => screen.getByRole('heading', { name });
const sessionsButton = () => screen.getByTestId('digitalExperienceChartMetric-sessions');

const mockShadedZones: RectAnnotationProps['dataValues'][] = [];

// jsdom draws no canvas, so the test reads the zones `Endzones` hands to the annotation.
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    RectAnnotation: (props: RectAnnotationProps) => {
      mockShadedZones.push(props.dataValues);
      return null;
    },
  };
});

jest.mock('../../../hooks/use_kibana_services');

beforeEach(() => {
  localStorage.clear();
  mockShadedZones.length = 0;
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('PageLoadsChart', () => {
  it('says when there are no page loads', () => {
    renderChart();

    expect(screen.getByText('No page loads in the selected time range')).toBeInTheDocument();
  });

  it('shades the first and last buckets where they cover only part of the range', () => {
    renderChart({ pageLoads: HOURLY_COUNTS, range: { start: HOUR / 2, end: 2.5 * HOUR } });

    expect(mockShadedZones[mockShadedZones.length - 1]).toEqual([
      { coordinates: { x1: HOUR / 2 } },
      { coordinates: { x0: 2.5 * HOUR } },
    ]);
  });

  it('shades nothing when the range matches the bucket edges', () => {
    renderChart({ pageLoads: HOURLY_COUNTS });

    expect(mockShadedZones[mockShadedZones.length - 1]).toEqual([]);
  });

  it('shows the loading state, not the empty message, while loading', () => {
    renderChart({ pageLoads: [], isLoading: true });

    expect(screen.queryByText('No page loads in the selected time range')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  describe('the metric', () => {
    it('is the page loads by default', () => {
      renderChart();

      expect(title('Page loads')).toBeInTheDocument();
      expect(sessionsButton()).toBeEnabled();
    });

    it('switches to the sessions, and keeps the choice in the local storage', () => {
      renderChart();

      fireEvent.click(sessionsButton());

      expect(title('Sessions')).toBeInTheDocument();
      expect(
        screen.getByText('No sessions started in the selected time range')
      ).toBeInTheDocument();
      expect(storedChoice()).toBe('sessions');
    });

    it('switches back to the page loads', () => {
      storeChoice('sessions');
      renderChart();

      fireEvent.click(screen.getByTestId('digitalExperienceChartMetric-pageLoads'));

      expect(title('Page loads')).toBeInTheDocument();
      expect(storedChoice()).toBe('pageLoads');
    });

    it('starts with the sessions when they were the last choice', () => {
      storeChoice('sessions');
      renderChart();

      expect(title('Sessions')).toBeInTheDocument();
    });

    it('falls back to the page loads for anything else in the storage', () => {
      storeChoice('weekly');
      renderChart();

      expect(title('Page loads')).toBeInTheDocument();
    });
  });

  describe('without sessions, as when they are not counted', () => {
    it('disables the sessions and shows the page loads', () => {
      renderChart({ sessions: null });

      expect(sessionsButton()).toBeDisabled();
      expect(title('Page loads')).toBeInTheDocument();
    });

    it('shows the page loads while keeping the choice of sessions for when they are back', () => {
      storeChoice('sessions');
      const { rerender } = renderChart({ sessions: null });

      expect(title('Page loads')).toBeInTheDocument();
      expect(storedChoice()).toBe('sessions');

      rerender(
        <PageLoadsChart
          pageLoads={NO_COUNTS}
          sessions={NO_COUNTS}
          interval={{ value: 3600, unit: 's' }}
          range={undefined}
          isLoading={false}
          onTimeRangeSelect={jest.fn()}
        />
      );
      expect(title('Sessions')).toBeInTheDocument();
    });

    it('waits for the answer before giving up on the sessions the user chose', () => {
      storeChoice('sessions');
      renderChart({ sessions: null, isLoading: true });

      expect(title('Sessions')).toBeInTheDocument();
      expect(sessionsButton()).toBeEnabled();
    });
  });
});
