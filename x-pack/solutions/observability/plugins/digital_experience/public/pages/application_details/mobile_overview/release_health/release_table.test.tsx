/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { OTHER_RELEASE_KEY } from '../../../../../common/mobile/releases';
import type { MobileReleaseRow } from '../../../../../common/types/mobile';
import { createFormatters, useFormatters } from '../../../../hooks/use_formatters';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { getReleaseColors } from './release_colors';
import { TEST_VIS_COLORS } from './release_colors.test_helpers';
import { ReleaseTable, sortReleases } from './release_table';

jest.mock('../../../../hooks/use_formatters', () => ({
  ...jest.requireActual('../../../../hooks/use_formatters'),
  useFormatters: jest.fn(),
}));

const RELEASES: MobileReleaseRow[] = [
  { release: '2.0.0', isOther: false, sessions: 600, users: 150, errorRate: 0.256 },
  { release: '1.5.0', isOther: false, sessions: 300, users: 200, errorRate: 0.1 },
  { release: '1.0.0', isOther: false, sessions: 60, users: 40, errorRate: null },
  { release: OTHER_RELEASE_KEY, isOther: true, sessions: 40, users: 500, errorRate: null },
];

const onSelectRelease = jest.fn();

const renderTable = (selectedRelease?: string) =>
  render(
    <ReleaseTable
      releases={RELEASES}
      colors={getReleaseColors(RELEASES, TEST_VIS_COLORS)}
      selectedRelease={selectedRelease}
      onSelectRelease={onSelectRelease}
    />,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>{children}</EuiProvider>
        </I18nProvider>
      ),
    }
  );

const row = (release: string) => screen.getByTestId(`digitalExperienceMobileReleaseRow-${release}`);

const releasesInOrder = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map(
      (tableRow) => within(tableRow).getByTestId('digitalExperienceMobileReleaseName').textContent
    );

beforeEach(() => {
  onSelectRelease.mockClear();
  jest.mocked(useFormatters).mockReturnValue(createFormatters(createUiSettingsMock()));
});

describe('ReleaseTable', () => {
  it('has a column for the release, sessions, users and error rate', () => {
    renderTable();

    ['Release', 'Sessions', 'Users', 'Error rate'].forEach((name) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(name) })).toBeInTheDocument();
    });
  });

  it('labels the "Other" row, and keeps it last', () => {
    renderTable();

    expect(releasesInOrder()).toEqual(['2.0.0', '1.5.0', '1.0.0', 'Other']);
  });

  it("shows each release's share of the sessions", () => {
    renderTable();

    expect(row('2.0.0')).toHaveTextContent('600 (60%)');
    expect(row('')).toHaveTextContent('40 (4%)');
  });

  it('shows the error rate with two decimals, and "Not enough data" below the floor', () => {
    renderTable();

    expect(row('2.0.0')).toHaveTextContent('0.26');
    expect(within(row('2.0.0')).queryByText('Not enough data')).toBeNull();
    expect(within(row('1.0.0')).getByText('Not enough data')).toBeInTheDocument();
  });

  it('filters by a release, and takes the filter off when it is selected', () => {
    const { unmount } = renderTable();
    fireEvent.click(within(row('1.5.0')).getByRole('button', { name: 'Filter by release 1.5.0' }));
    expect(onSelectRelease).toHaveBeenLastCalledWith('1.5.0');
    unmount();

    renderTable('1.5.0');
    const selected = within(row('1.5.0')).getByRole('button', {
      name: 'Stop filtering by release 1.5.0',
    });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(selected);
    expect(onSelectRelease).toHaveBeenLastCalledWith(undefined);
  });

  it('has no filter on "Other", which is no release', () => {
    renderTable();

    expect(within(row('')).queryByRole('button')).toBeNull();
    expect(screen.getAllByTestId('digitalExperienceMobileReleaseFilterLink')).toHaveLength(3);
  });

  it('sorts by a column, with "Other" still last', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /Users/ }));
    expect(releasesInOrder()).toEqual(['1.0.0', '2.0.0', '1.5.0', 'Other']);

    fireEvent.click(screen.getByRole('button', { name: /Users/ }));
    expect(releasesInOrder()).toEqual(['1.5.0', '2.0.0', '1.0.0', 'Other']);
  });
});

describe('sortReleases', () => {
  it('puts the releases without an error rate after the others, either way, and "Other" last', () => {
    const order = (direction: 'asc' | 'desc') =>
      sortReleases(RELEASES, { field: 'errorRate', direction }).map(({ release }) => release);

    expect(order('desc')).toEqual(['2.0.0', '1.5.0', '1.0.0', OTHER_RELEASE_KEY]);
    expect(order('asc')).toEqual(['1.5.0', '2.0.0', '1.0.0', OTHER_RELEASE_KEY]);
  });
});
