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

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../sourcerer/containers');

const defaultProps = {
  end: undefined,
  filters: undefined,
  localStorageAttackDiscoveryMaxAlerts: undefined,
  onClose: jest.fn(),
  query: undefined,
  setEnd: jest.fn(),
  setFilters: jest.fn(),
  setLocalStorageAttackDiscoveryMaxAlerts: jest.fn(),
  setQuery: jest.fn(),
  setStart: jest.fn(),
  start: undefined,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

describe('useTabsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
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
  });

  it('should return the alert selection component with `AlertSelectionQuery` when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    expect(screen.getByTestId('customizeAlerts')).toBeInTheDocument();
  });

  it('should return the alert selection component with `AlertSelectionRange` when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
  });

  it('should return the empty schedule component with empty schedule page when schedule tab is selected', async () => {
    const { result } = renderHook(() => useTabsView({ filterSettings: defaultProps }));

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
    const { result } = renderHook(() => useTabsView({ filterSettings: defaultProps }));

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
    const { result } = renderHook(() => useTabsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('reset')).toBeInTheDocument();
  });

  it('should return save action button when settings tab is selected', () => {
    const { result } = renderHook(() => useTabsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('save')).toBeInTheDocument();
  });

  it('should not return action buttons when schedule tab is selected', async () => {
    const { result } = renderHook(() => useTabsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);

    const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
    act(() => {
      fireEvent.click(scheduleTabButton); // clicking invokes tab switching
    });
    render(<TestProviders>{result.current.tabsContainer}</TestProviders>);
    await waitFor(() => {
      expect(result.current.actionButtons).toBeUndefined();
    });
  });
});
