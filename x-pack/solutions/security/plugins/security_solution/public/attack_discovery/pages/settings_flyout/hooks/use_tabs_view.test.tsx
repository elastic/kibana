/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useTabsView } from './use_tabs_view';
import { TestProviders } from '../../../../common/mock';
import { useFindAttackDiscoverySchedules } from '../schedule/logic/use_find_schedules';
import { mockFindAttackDiscoverySchedules } from '../../mock/mock_find_attack_discovery_schedules';

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../sourcerer/containers');
jest.mock('../schedule/logic/use_find_schedules');

const defaultProps = {
  connectorId: undefined,
  onConnectorIdSelected: jest.fn(),
  onSettingsReset: jest.fn(),
  onSettingsSave: jest.fn(),
  onSettingsChanged: jest.fn(),
  settings: {
    end: 'now',
    filters: [],
    query: { query: '', language: 'kuery' },
    size: 100,
    start: 'now-15m',
  },
  stats: null,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;
const mockUseFindAttackDiscoverySchedules = useFindAttackDiscoverySchedules as jest.MockedFunction<
  typeof useFindAttackDiscoverySchedules
>;
const getBooleanValueMock = jest.fn();

describe('useTabsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getBooleanValueMock.mockReturnValue(false);

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: getBooleanValueMock,
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);

    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: { schedules: [], total: 0 },
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);
  });

  it('should return the alert selection component with `AlertSelectionQuery` when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    expect(screen.getByTestId('customizeAlerts')).toBeInTheDocument();
  });

  it('should return the alert selection component with `AlertSelectionRange` when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
  });

  it('should return the empty schedule component with empty schedule page when schedule tab is selected', async () => {
    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton); // clicking invokes tab switching
    });
    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);
    await waitFor(() => {
      expect(screen.getByTestId('emptySchedule')).toBeInTheDocument();
    });
  });

  it('should return the empty schedule component with create new schedule button when schedule tab is selected', async () => {
    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton); // clicking invokes tab switching
    });
    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);
    await waitFor(() => {
      expect(screen.getByTestId('createSchedule')).toBeInTheDocument();
    });
  });

  it('should return reset action button when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('reset')).toBeInTheDocument();
  });

  it('should return save action button when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('save')).toBeInTheDocument();
  });

  it('should not return action buttons when schedule tab is selected', async () => {
    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton); // clicking invokes tab switching
    });
    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);
    await waitFor(() => {
      expect(result.current.actionButtons).toBeNull();
    });
  });

  it('should not return `create new schedule` action button when schedule tab is selected and there are existing schedules', async () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: mockFindAttackDiscoverySchedules,
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    const { result } = renderHook(() => useTabsView(defaultProps));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton); // clicking invokes tab switching
    });

    // Render action buttons of the Schedule tab
    render(<TestProviders>{result.current.actionButtons}</TestProviders>);
    await waitFor(() => {
      expect(screen.getByTestId('createNewSchedule')).toBeInTheDocument();
    });
  });
});
