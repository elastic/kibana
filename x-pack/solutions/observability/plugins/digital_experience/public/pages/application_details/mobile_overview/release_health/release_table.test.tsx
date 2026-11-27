/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { MAX_RELEASE_LENGTH } from '../../../../../common/filter_lengths';
import { OTHER_RELEASE_KEY } from '../../../../../common/mobile/releases';
import type { MobileReleaseRow } from '../../../../../common/types/mobile';
import { createFormatters, useFormatters } from '../../../../hooks/use_formatters';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { getReleaseColors } from './release_colors';
import { TEST_VIS_COLORS } from './release_colors.test_helpers';
import { DEFAULT_RELEASE_SORT, ReleaseTable, sortReleases } from './release_table';

jest.mock('../../../../hooks/use_formatters', () => ({
  ...jest.requireActual('../../../../hooks/use_formatters'),
  useFormatters: jest.fn(),
}));

const RELEASES: MobileReleaseRow[] = [
  {
    release: '2.0.0',
    isOther: false,
    sessions: 600,
    users: 150,
    errorRate: 0.256,
    coldStart: 2600,
    coldStarts: 120,
  },
  {
    release: '1.5.0',
    isOther: false,
    sessions: 300,
    users: 200,
    errorRate: 0.1,
    coldStart: null,
    coldStarts: 0,
  },
  {
    release: '1.0.0',
    isOther: false,
    sessions: 60,
    users: 40,
    errorRate: null,
    coldStart: null,
    coldStarts: 0,
  },
  {
    release: OTHER_RELEASE_KEY,
    isOther: true,
    sessions: 40,
    users: 500,
    errorRate: null,
    coldStart: null,
    coldStarts: 0,
  },
];

const onSelectRelease = jest.fn();

/** The table with its sort kept above it, as the release health keeps it. */
function SortedTable(props: Omit<React.ComponentProps<typeof ReleaseTable>, 'sort' | 'onSort'>) {
  const [sort, setSort] = useState(DEFAULT_RELEASE_SORT);
  return <ReleaseTable {...props} sort={sort} onSort={setSort} />;
}

const renderTable = (selectedRelease?: string) =>
  render(
    <SortedTable
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
  it('has a column for the release, sessions, users, error rate and cold start', () => {
    renderTable();

    ['Release', 'Sessions', 'Users', 'Error rate', 'Avg. cold start'].forEach((name) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(name) })).toBeInTheDocument();
    });
  });

  it('labels the "Other" row, and keeps it last', () => {
    renderTable();

    expect(releasesInOrder()).toEqual(['2.0.0', '1.5.0', '1.0.0', 'Other']);
  });

  it('shows a share with one decimal at most, e.g. 91.7%', () => {
    render(
      <SortedTable
        releases={[
          {
            release: '2.0.0',
            isOther: false,
            sessions: 11,
            users: 1,
            errorRate: null,
            coldStart: null,
            coldStarts: 0,
          },
          {
            release: '1.0.0',
            isOther: false,
            sessions: 1,
            users: 1,
            errorRate: null,
            coldStart: null,
            coldStarts: 0,
          },
        ]}
        colors={new Map()}
        selectedRelease={undefined}
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

    expect(row('2.0.0')).toHaveTextContent('11 (91.7%)');
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
    expect(
      within(row('1.0.0')).getByTestId('digitalExperienceMobileReleaseErrorRate')
    ).toHaveTextContent('Not enough data');
  });

  it('shows the average cold start with its count, a dash without cold starts, and holds it back below the floor', async () => {
    renderTable();

    const coldStart = (release: string) =>
      within(row(release)).getByTestId('digitalExperienceMobileReleaseColdStart');
    expect(coldStart('2.0.0')).toHaveTextContent('2.60 s');
    fireEvent.mouseOver(within(coldStart('2.0.0')).getByText('2.60 s'));
    expect(await screen.findByText('120 cold starts')).toBeInTheDocument();
    // Enough sessions, but no cold start
    expect(coldStart('1.5.0')).toHaveTextContent('—');
    // Below 100 sessions, as the error rate
    expect(coldStart('1.0.0')).toHaveTextContent('Not enough data');
    expect(coldStart('')).toHaveTextContent('Not enough data');
  });

  it('filters by a release, and takes the filter off when it is selected', () => {
    const { unmount } = renderTable();
    fireEvent.click(within(row('1.5.0')).getByRole('button', { name: 'Filter by release 1.5.0' }));
    expect(onSelectRelease).toHaveBeenLastCalledWith('1.5.0');
    unmount();

    // The selected release is a removable pill
    renderTable('1.5.0');
    fireEvent.click(
      within(row('1.5.0')).getByRole('button', { name: 'Stop filtering by release 1.5.0' })
    );
    expect(onSelectRelease).toHaveBeenLastCalledWith(undefined);
  });

  it('shows no share while filtered by a release, which would always read 100%', () => {
    renderTable('2.0.0');

    expect(row('2.0.0')).toHaveTextContent('600');
    expect(row('2.0.0')).not.toHaveTextContent('%');
  });

  it('has no filter on "Other", which is no release', () => {
    renderTable();

    expect(within(row('')).queryByRole('button')).toBeNull();
    expect(screen.getAllByTestId('digitalExperienceMobileReleaseFilterLink')).toHaveLength(3);
  });

  it('has no filter on a release longer than the URL accepts, as the release picker', () => {
    const longRelease = 'v'.repeat(MAX_RELEASE_LENGTH + 1);
    render(
      <SortedTable
        releases={[
          {
            release: longRelease,
            isOther: false,
            sessions: 1,
            users: 1,
            errorRate: null,
            coldStart: null,
            coldStarts: 0,
          },
        ]}
        colors={new Map()}
        selectedRelease={undefined}
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

    expect(within(row(longRelease)).getByText(longRelease)).toBeInTheDocument();
    expect(within(row(longRelease)).queryByRole('button')).toBeNull();
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
  it('keeps equal releases in the same order, the highest first, whatever the direction', () => {
    const equal = ['1.0.0', '2.0.0', '1.5.0'].map((release) => ({
      release,
      isOther: false,
      sessions: 10,
      users: 1,
      errorRate: null,
      coldStart: null,
      coldStarts: 0,
    }));
    const order = (direction: 'asc' | 'desc') =>
      sortReleases(equal, { field: 'sessions', direction }).map(({ release }) => release);

    expect(order('asc')).toEqual(['2.0.0', '1.5.0', '1.0.0']);
    expect(order('desc')).toEqual(['2.0.0', '1.5.0', '1.0.0']);
  });

  it('puts the releases without an error rate after the others, either way, and "Other" last', () => {
    const order = (direction: 'asc' | 'desc') =>
      sortReleases(RELEASES, { field: 'errorRate', direction }).map(({ release }) => release);

    expect(order('desc')).toEqual(['2.0.0', '1.5.0', '1.0.0', OTHER_RELEASE_KEY]);
    expect(order('asc')).toEqual(['1.5.0', '2.0.0', '1.0.0', OTHER_RELEASE_KEY]);
  });
});
