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
import type { MobileReleasesResponse } from '../../../../../common/types/mobile';
import { ReleaseHealth } from './release_health';
import type { MobileReleasesState } from './use_mobile_releases';

jest.mock('./release_table', () => ({
  ReleaseTable: () => <div data-test-subj="digitalExperienceMobileReleaseTable" />,
}));
jest.mock('./release_charts', () => ({
  ReleaseErrorRateChart: () => (
    <div data-test-subj="digitalExperienceMobileReleaseErrorRateChart" />
  ),
  ReleaseAdoptionChart: () => <div data-test-subj="digitalExperienceMobileReleaseAdoptionChart" />,
}));

const RELEASES: MobileReleasesResponse = {
  histogram: { interval: { value: 60, unit: 's' }, start: 0, end: 3_600_000 },
  releases: [{ release: '1.0.0', isOther: false, sessions: 120, users: 30, errorRate: 0.1 }],
  series: [{ release: '1.0.0', isOther: false, points: [] }],
  markers: [],
};

const renderSection = (state: Partial<MobileReleasesState>) =>
  render(
    <ReleaseHealth
      releasesState={{
        releases: undefined,
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

describe('ReleaseHealth', () => {
  it('shows the title, the table and both charts', () => {
    renderSection({ releases: RELEASES });

    expect(screen.getByText('Release health')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileReleaseTable')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileReleaseErrorRateChart')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileReleaseAdoptionChart')).toBeInTheDocument();
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
