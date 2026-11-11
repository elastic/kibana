/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { PageLoadsChart } from './page_loads_chart';

const STORAGE_KEY = 'xpack.digitalExperience.applications.chartMetric';

// No bucket has a count, so the chart shows its empty message, which says which metric it is of.
const NO_COUNTS = [{ timestamp: 0, count: 0 }];

const renderChart = ({
  pageLoads = NO_COUNTS,
  sessions = NO_COUNTS as typeof NO_COUNTS | null,
  isLoading = false,
}: Partial<
  Pick<Parameters<typeof PageLoadsChart>[0], 'pageLoads' | 'sessions' | 'isLoading'>
> = {}) =>
  render(
    <PageLoadsChart
      pageLoads={pageLoads}
      sessions={sessions}
      isLoading={isLoading}
      onTimeRangeSelect={jest.fn()}
    />,
    { wrapper: EuiProvider }
  );

const storeChoice = (value: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
const storedChoice = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

const title = (name: 'Page loads' | 'Sessions') => screen.getByRole('heading', { name });
const sessionsButton = () => screen.getByTestId('digitalExperienceChartMetric-sessions');

jest.mock('../../../hooks/use_kibana_services');

beforeEach(() => {
  localStorage.clear();
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('PageLoadsChart', () => {
  it('says when there are no page loads', () => {
    renderChart();

    expect(screen.getByText('No page loads in the selected time range')).toBeInTheDocument();
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
