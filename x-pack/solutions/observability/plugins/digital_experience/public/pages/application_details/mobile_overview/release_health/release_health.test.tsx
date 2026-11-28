/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { MobileReleasesResponse } from '../../../../../common/types/mobile';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ReleaseAdoptionChart, ReleaseErrorRateChart } from './release_charts';
import { ReleaseHealth } from './release_health';
import { ReleaseTable } from './release_table';
import type { MobileReleasesState } from './use_mobile_releases';

jest.mock('./release_table', () => ({
  ...jest.requireActual('./release_table'),
  ReleaseTable: jest.fn(() => <div data-test-subj="digitalExperienceMobileReleaseTable" />),
}));
jest.mock('./release_charts', () => ({
  ReleaseErrorRateChart: jest.fn(() => (
    <div data-test-subj="digitalExperienceMobileReleaseErrorRateChart" />
  )),
  ReleaseAdoptionChart: jest.fn(() => (
    <div data-test-subj="digitalExperienceMobileReleaseAdoptionChart" />
  )),
}));
jest.mock('../../../../hooks/use_time_range');

const setTimeRange = jest.fn();
const onSelectRelease = jest.fn();

beforeEach(() => {
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-1h', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange,
  });
});

const RELEASES: MobileReleasesResponse = {
  histogram: { interval: { value: 60, unit: 's' }, start: 0, end: 3_600_000 },
  releases: [
    {
      release: '1.0.0',
      isOther: false,
      sessions: 120,
      users: 30,
      errorRate: 0.1,
      coldStart: null,
      coldStarts: 0,
    },
  ],
  series: [{ release: '1.0.0', isOther: false, points: [] }],
  markers: [],
};

const sectionOf = (state: Partial<MobileReleasesState>) => (
  <ReleaseHealth
    releasesState={{
      releases: undefined,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
      ...state,
    }}
    selectedRelease="1.0.0"
    onSelectRelease={onSelectRelease}
    rankedReleases={RANKED_RELEASES}
  />
);

const RANKED_RELEASES = ['2.0.0', '1.0.0'];

const renderSection = (state: Partial<MobileReleasesState>) =>
  render(sectionOf(state), {
    wrapper: ({ children }) => (
      <I18nProvider>
        <EuiProvider>{children}</EuiProvider>
      </I18nProvider>
    ),
  });

describe('ReleaseHealth', () => {
  it('shows the title, the table and both charts', () => {
    renderSection({ releases: RELEASES });

    expect(screen.getByText('Release health')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileReleaseTable')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileReleaseErrorRateChart')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileReleaseAdoptionChart')).toBeInTheDocument();
  });

  it('lets the table filter by a release, and the charts narrow the time range', () => {
    renderSection({ releases: RELEASES });

    expect(jest.mocked(ReleaseTable).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ selectedRelease: '1.0.0', onSelectRelease })
    );
    [ReleaseErrorRateChart, ReleaseAdoptionChart].forEach((chart) =>
      expect(jest.mocked(chart).mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({ onTimeRangeSelect: setTimeRange })
      )
    );
  });

  it("keeps the table's sort across a reload", () => {
    const { rerender } = renderSection({ releases: RELEASES });
    const tableProps = () => jest.mocked(ReleaseTable).mock.calls.at(-1)?.[0];
    act(() => tableProps()?.onSort({ field: 'users', direction: 'asc' }));

    rerender(sectionOf({ isLoading: true }));
    rerender(sectionOf({ releases: RELEASES }));

    expect(tableProps()?.sort).toEqual({ field: 'users', direction: 'asc' });
  });

  it('titles its error under the section, as an h3', () => {
    renderSection({ error: new Error('Internal Server Error') });

    expect(
      screen.getByRole('heading', { level: 3, name: 'Could not load the release health' })
    ).toBeInTheDocument();
  });

  it('shows its own loading state', () => {
    renderSection({ isLoading: true });

    expect(screen.getByTestId('digitalExperienceMobileReleasesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceMobileReleaseTable')).toBeNull();
  });

  it('shows its own error with a retry', () => {
    const refresh = jest.fn();
    renderSection({ error: new Error('Internal Server Error'), refresh });

    expect(screen.getByTestId('digitalExperienceMobileReleasesError')).toHaveTextContent(
      'Internal Server Error'
    );
    fireEvent.click(screen.getByTestId('digitalExperienceMobileReleasesRetry'));

    expect(refresh).toHaveBeenCalled();
  });

  it('says so without releases', () => {
    renderSection({ releases: { ...RELEASES, releases: [], series: [] } });

    expect(screen.getByTestId('digitalExperienceMobileReleasesEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceMobileReleaseTable')).toBeNull();
  });
});
