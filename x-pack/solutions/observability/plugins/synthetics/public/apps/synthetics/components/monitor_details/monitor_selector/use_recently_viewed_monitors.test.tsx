/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import type { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import * as localStorageModule from 'react-use/lib/useLocalStorage';
import { fetchMonitorManagementList } from '../../../state';

import * as useMonitorQueryModule from '../hooks/use_monitor_query_id';
import { useRecentlyViewedMonitors } from './use_recently_viewed_monitors';
import { WrappedHelper } from '../../../utils/testing';
import { MONITOR_ROUTE } from '../../../../../../common/constants';

vi.mock('../../../state', async () => {
  const mocked = {
    ...(await vi.importActual('../../../state')),
    fetchMonitorManagementList: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/observability-shared-plugin/public', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/observability-shared-plugin/public')),
    useFetcher: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useRecentlyViewedMonitors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns expected result', () => {
    const WrapperWithState = ({ children }: React.PropsWithChildren) => {
      return (
        <WrappedHelper url="/monitor/1" path={MONITOR_ROUTE}>
          {React.createElement(React.Fragment, null, children)}
        </WrappedHelper>
      );
    };

    vi.spyOn(useMonitorQueryModule, 'useMonitorQueryId').mockReturnValue('1');
    (useFetcher as Mock).mockImplementation((callback) => {
      callback();
      return { loading: false, status: 'success' as FETCH_STATUS.SUCCESS, refetch: () => {} };
    });

    const { result } = renderHook(() => useRecentlyViewedMonitors(), { wrapper: WrapperWithState });
    expect(result.current).toEqual({ loading: false, recentMonitorOptions: [] });
  });

  it('fetches the persisted ids and persists the updated information', async () => {
    const currentMonitorQueryId = 'id-01';
    const monitorQueryId3 = 'persisted-id-03';
    let persistedIds = ['persisted-id-02', monitorQueryId3];
    const setPersistedIdsMock = vi.fn().mockImplementation((ids: string[]) => {
      persistedIds = ids;
    });

    vi.spyOn(useMonitorQueryModule, 'useMonitorQueryId').mockImplementation(
      () => currentMonitorQueryId
    );

    vi.spyOn(localStorageModule, 'default').mockImplementation(() => [
      persistedIds,
      setPersistedIdsMock,
      () => {},
    ]);

    (useFetcher as Mock).mockImplementation((callback) => {
      callback();
      return { loading: false, status: 'success' as FETCH_STATUS.SUCCESS, refetch: () => {} };
    });

    // Return only 'persisted-id-03' to mark 'persisted-id-02' as a deleted monitor
    const fetchedMonitor = {
      id: monitorQueryId3,
      name: 'Monitor 03',
      locations: [],
    };
    (fetchMonitorManagementList as Mock).mockReturnValue({
      monitors: [fetchedMonitor],
    });

    const WrapperWithState = ({ children }: React.PropsWithChildren) => {
      return (
        <WrappedHelper url="/monitor/1" path={MONITOR_ROUTE}>
          {React.createElement(React.Fragment, null, children)}
        </WrappedHelper>
      );
    };
    const { result, rerender } = renderHook(() => useRecentlyViewedMonitors(), {
      wrapper: WrapperWithState,
    });
    await waitFor(() => persistedIds);

    // Sets the current monitor as well as updated information
    expect(setPersistedIdsMock).toHaveBeenCalledWith([currentMonitorQueryId, monitorQueryId3]);

    rerender();
    const expectedOptions = [
      {
        isGroupLabel: true,
        key: 'recently_viewed',
        label: 'Recently viewed',
      },
      {
        isGroupLabel: false,
        key: fetchedMonitor.id,
        label: fetchedMonitor.name,
        locationIds: fetchedMonitor.locations,
        monitorQueryId: monitorQueryId3,
      },
    ];
    expect(result.current).toEqual({ loading: false, recentMonitorOptions: expectedOptions });
  });
});
