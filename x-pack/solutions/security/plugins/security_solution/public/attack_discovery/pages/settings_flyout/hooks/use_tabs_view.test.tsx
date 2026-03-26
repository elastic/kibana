/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import { useTabsView } from './use_tabs_view';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useFindAttackDiscoverySchedules } from '../schedule/logic/use_find_schedules';
import { mockFindAttackDiscoverySchedules } from '../../mock/mock_find_attack_discovery_schedules';
import { useSettingsView } from './use_settings_view';
import { useScheduleView } from './use_schedule_view';
import type { AlertsSelectionSettings } from '../types';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
}));
jest.mock('./use_settings_view');
jest.mock('./use_schedule_view');
jest.mock('../schedule/logic/use_find_schedules');

const mockUseSettingsView = useSettingsView as jest.Mock;
const mockUseScheduleView = useScheduleView as jest.Mock;
const mockUseFindAttackDiscoverySchedules = useFindAttackDiscoverySchedules as jest.MockedFunction<
  typeof useFindAttackDiscoverySchedules
>;

const defaultProps = {
  connectorId: undefined,
  onConnectorIdSelected: jest.fn(),
  onGenerate: jest.fn(),
  onSettingsChanged: jest.fn(),
  onSettingsReset: jest.fn(),
  onSettingsSave: jest.fn(),
  settings: {
    end: 'now-24h',
    filters: [],
    query: { query: '', language: 'kuery' },
    size: 100,
    start: 'now-15m',
  } as AlertsSelectionSettings,
  stats: null,
};

describe('useTabsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettingsView.mockReturnValue({
      settingsView: <div data-test-subj="mockSettingsView" />,
      actionButtons: (
        <>
          <div data-test-subj="reset" />
          <div data-test-subj="save" />
        </>
      ),
    });

    mockUseScheduleView.mockReturnValue({
      scheduleView: <div data-test-subj="mockScheduleView" />,
      actionButtons: <div data-test-subj="createNewSchedule" />,
    });

    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: { schedules: [], total: 0 },
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);
  });

  it('renders the settings view by default', () => {
    const { result } = renderHook(() => useTabsView(defaultProps), { wrapper: TestProviders });

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    expect(screen.getByTestId('mockSettingsView')).toBeInTheDocument();
  });

  it('renders the schedule view when schedule tab is clicked', async () => {
    const { result, rerender } = renderHook(() => useTabsView(defaultProps), {
      wrapper: TestProviders,
    });

    const { unmount } = render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton);
    });

    // Re-render the hook to get the updated state
    rerender(defaultProps);
    unmount();
    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    await waitFor(() => {
      expect(screen.getByTestId('mockScheduleView')).toBeInTheDocument();
    });
  });

  it('returns settings action buttons when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView(defaultProps), { wrapper: TestProviders });

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('reset')).toBeInTheDocument();
    expect(screen.getByTestId('save')).toBeInTheDocument();
  });

  it('returns schedule action buttons when schedule tab is selected', async () => {
    const { result, rerender } = renderHook(() => useTabsView(defaultProps), {
      wrapper: TestProviders,
    });

    const { unmount } = render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton);
    });

    rerender(defaultProps);
    unmount();
    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    await waitFor(() => {
      expect(screen.getByTestId('createNewSchedule')).toBeInTheDocument();
    });
  });

  it('returns schedule action buttons when schedule tab is selected and there are existing schedules', async () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: mockFindAttackDiscoverySchedules,
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    const { result, rerender } = renderHook(() => useTabsView(defaultProps), {
      wrapper: TestProviders,
    });

    const { unmount } = render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton);
    });

    rerender(defaultProps);
    unmount();
    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    await waitFor(() => {
      expect(screen.getByTestId('createNewSchedule')).toBeInTheDocument();
    });
  });
});
