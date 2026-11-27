/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { MobileAppStartsResponse } from '../../../../../common/types/mobile';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { AppStartChart } from './app_start_charts';
import { Performance } from './performance';
import type { MobileAppStartsState } from './use_mobile_app_starts';

jest.mock('./app_start_charts', () => ({
  AppStartChart: jest.fn(({ type }: { type: string }) => (
    <div data-test-subj={`appStartChart-${type}`} />
  )),
}));
jest.mock('../../../../hooks/use_time_range');

const setTimeRange = jest.fn();

const APP_STARTS: MobileAppStartsResponse = {
  histogram: { interval: { value: 60, unit: 's' }, start: 0, end: 3_600_000 },
  points: [{ timestamp: 0, cold: { avg: 1800, count: 42 }, warm: { avg: 350, count: 7 } }],
};

const renderSection = (state: Partial<MobileAppStartsState>) =>
  render(
    <Performance
      appStartsState={{
        appStarts: undefined,
        isLoading: false,
        error: undefined,
        refresh: jest.fn(),
        ...state,
      }}
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
  jest.clearAllMocks();
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-1h', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange,
  });
});

describe('Performance', () => {
  it('heads the cold and warm start charts with its title', () => {
    renderSection({ appStarts: APP_STARTS });

    expect(screen.getByRole('heading', { name: 'Performance' })).toBeInTheDocument();
    expect(screen.getByTestId('appStartChart-cold')).toBeInTheDocument();
    expect(screen.getByTestId('appStartChart-warm')).toBeInTheDocument();
    expect(jest.mocked(AppStartChart).mock.calls[0][0]).toEqual({
      type: 'cold',
      points: APP_STARTS.points,
      histogram: APP_STARTS.histogram,
      onTimeRangeSelect: setTimeRange,
    });
  });

  it('shows its loading state', () => {
    renderSection({ isLoading: true });

    expect(screen.getByTestId('digitalExperienceMobilePerformanceLoading')).toBeInTheDocument();
    expect(AppStartChart).not.toHaveBeenCalled();
  });

  it('shows its error with a retry', () => {
    const refresh = jest.fn();
    renderSection({ error: new Error('boom'), refresh });

    expect(screen.getByTestId('digitalExperienceMobilePerformanceError')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('digitalExperienceMobilePerformanceRetry'));
    expect(refresh).toHaveBeenCalled();
  });

  it('says no app starts were found in the readable data, without charts, when there were none', () => {
    renderSection({ appStarts: { ...APP_STARTS, points: [] } });

    // Not "the SDK sent none": a user who can't read the logs sees no starts either
    expect(screen.getByTestId('digitalExperienceMobilePerformanceEmpty')).toHaveTextContent(
      'No app start events (elastic.app.start) in the data you can read'
    );
    expect(AppStartChart).not.toHaveBeenCalled();
  });
});
