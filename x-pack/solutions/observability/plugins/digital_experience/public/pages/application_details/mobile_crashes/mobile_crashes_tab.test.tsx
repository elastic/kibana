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
import type { MobileCrashGroup } from '../../../../common/types/mobile';
import { useQueryParam } from '../../../hooks/use_query_param';
import { MobileToolbar, useMobileFilters } from '../mobile_overview/mobile_toolbar';
import type { MobileKpisState } from '../mobile_overview/use_mobile_kpis';
import { MobileCrashFlyout } from './mobile_crash_flyout';
import { MobileCrashGroupsTable } from './mobile_crash_groups_table';
import { MobileCrashesTab } from './mobile_crashes_tab';
import { useMobileCrashGroups, type MobileCrashGroupsState } from './use_mobile_crash_groups';

jest.mock('../../../hooks/use_query_param');
jest.mock('./use_mobile_crash_groups');
jest.mock('../mobile_overview/mobile_toolbar', () => ({
  MobileToolbar: jest.fn(({ onRefresh }: { onRefresh: () => void }) => (
    <button type="button" onClick={onRefresh}>
      Refresh
    </button>
  )),
  useMobileFilters: jest.fn(),
}));
jest.mock('./mobile_crash_flyout', () => ({
  MobileCrashFlyout: jest.fn(({ onClose }: { onClose: () => void }) => (
    <button type="button" data-test-subj="crashFlyout" onClick={onClose}>
      Flyout
    </button>
  )),
}));
jest.mock('./mobile_crash_groups_table', () => ({
  MobileCrashGroupsTable: jest.fn(({ onSelect }: { onSelect: (fingerprint: string) => void }) => (
    <button type="button" data-test-subj="crashGroupsTable" onClick={() => onSelect('npe')}>
      Table
    </button>
  )),
}));

const GROUP: MobileCrashGroup = {
  fingerprint: 'npe',
  type: 'java.lang.NullPointerException',
  message: null,
  users: 1,
  events: 1,
  sessions: 1,
  firstSeen: { time: '2021-01-18T12:00:00.000Z', release: '4.2.0' },
  lastSeen: { time: '2021-01-18T12:00:00.000Z', release: '4.2.0' },
  newInRelease: null,
};

const KPIS_STATE: MobileKpisState = {
  kpis: undefined,
  currentKpis: undefined,
  isLoading: false,
  error: undefined,
  refresh: jest.fn(),
};

const setCrashGroup = jest.fn();

const mockCrashGroups = (state: Partial<MobileCrashGroupsState>) =>
  jest.mocked(useMobileCrashGroups).mockReturnValue({
    response: { crashGroups: [GROUP], isPartial: false },
    isLoading: false,
    error: undefined,
    refresh: jest.fn(),
    ...state,
  });

const renderTab = () =>
  render(<MobileCrashesTab serviceName="trailmap-android" kpisState={KPIS_STATE} />, {
    wrapper: ({ children }) => (
      <I18nProvider>
        <EuiProvider>{children}</EuiProvider>
      </I18nProvider>
    ),
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useQueryParam).mockReturnValue({ value: undefined, setValue: setCrashGroup });
  jest.mocked(useMobileFilters).mockReturnValue({ isFiltered: false });
  mockCrashGroups({});
});

describe('MobileCrashesTab', () => {
  it("lists the application's crash groups, and opens one in the URL", () => {
    renderTab();

    expect(useMobileCrashGroups).toHaveBeenCalledWith('trailmap-android');
    expect(jest.mocked(MobileCrashGroupsTable).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ crashGroups: [GROUP], isLoading: false })
    );
    fireEvent.click(screen.getByTestId('crashGroupsTable'));
    expect(setCrashGroup).toHaveBeenCalledWith('npe');
  });

  it('refreshes the crashes and the filter options together', () => {
    const refresh = jest.fn();
    mockCrashGroups({ refresh });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(KPIS_STATE.refresh).toHaveBeenCalledTimes(1);
    expect(jest.mocked(MobileToolbar).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ kpis: undefined })
    );
  });

  it('shows the error with a retry', () => {
    const refresh = jest.fn();
    mockCrashGroups({ response: undefined, error: new Error('boom'), refresh });
    renderTab();

    expect(screen.getByTestId('digitalExperienceMobileCrashesError')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('digitalExperienceMobileCrashesRetry'));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('crashGroupsTable')).toBeNull();
  });

  it("says when the user can't read every logs index", () => {
    mockCrashGroups({ response: { crashGroups: [GROUP], isPartial: true } });
    renderTab();

    expect(screen.getByTestId('digitalExperienceMobileCrashesPartialAccess')).toBeInTheDocument();
  });

  it('says there are no crashes, rather than showing an empty table', () => {
    mockCrashGroups({ response: { crashGroups: [], isPartial: false } });
    renderTab();

    expect(screen.getByTestId('digitalExperienceMobileCrashesEmpty')).toHaveTextContent(
      'A crash is sent when the app is opened again'
    );
    expect(screen.queryByTestId('crashGroupsTable')).toBeNull();
  });

  it('offers to clear the filters when none of the crashes match them', () => {
    jest.mocked(useMobileFilters).mockReturnValue({
      isFiltered: true,
      clearFiltersButton: <button type="button">Clear filters</button>,
    });
    mockCrashGroups({ response: { crashGroups: [], isPartial: false } });
    renderTab();

    expect(screen.getByTestId('digitalExperienceMobileCrashesEmpty')).toHaveTextContent(
      'matches the selected environment, OS and release'
    );
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it("opens the URL's crash group in the flyout, with the group the list has, and closes it", () => {
    jest.mocked(useQueryParam).mockReturnValue({ value: 'npe', setValue: setCrashGroup });
    renderTab();

    expect(jest.mocked(MobileCrashFlyout).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ serviceName: 'trailmap-android', fingerprint: 'npe', group: GROUP })
    );
    fireEvent.click(screen.getByTestId('crashFlyout'));
    expect(setCrashGroup).toHaveBeenCalledWith(undefined);
  });

  it('opens no flyout without a crash group in the URL', () => {
    renderTab();

    expect(screen.queryByTestId('crashFlyout')).toBeNull();
  });
});
