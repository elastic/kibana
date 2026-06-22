/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import * as reactRedux from 'react-redux';
import { useMonitorLatestPing } from './use_monitor_latest_ping';
import { ConfigKey, MonitorTypeEnum, type Ping } from '../../../../../../common/runtime_types';
import { getMonitorLastRunAction } from '../../../state';
import { fetchLatestTestRun } from '../../../state/monitor_details/api';

// Mirror of the real FETCH_STATUS enum values so the mocked module stays in
// sync with @kbn/observability-shared-plugin/public.
const FETCH_STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  FAILURE: 'failure',
  PENDING: 'pending',
} as const;

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    PENDING: 'pending',
  },
  useFetcher: jest.fn().mockReturnValue({ data: undefined, status: 'pending', loading: false }),
}));

jest.mock('../../../state/monitor_details/api', () => ({
  fetchLatestTestRun: jest.fn().mockResolvedValue({ ping: undefined }),
}));

jest.mock('../../../contexts', () => ({
  useSyntheticsRefreshContext: () => ({ lastRefresh: 0 }),
}));

const mockUrlParams = jest.fn();
jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => mockUrlParams(),
}));

const mockUseSelectedMonitor = jest.fn();
jest.mock('./use_selected_monitor', () => ({
  useSelectedMonitor: () => mockUseSelectedMonitor(),
}));

const mockUseSelectedLocation = jest.fn();
jest.mock('./use_selected_location', () => ({
  useSelectedLocation: () => mockUseSelectedLocation(),
}));

const mockDispatch = jest.fn();
const mockLatestPingState = jest.fn();
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: unknown) => {
      void selector;
      return mockLatestPingState();
    },
  };
});

const useFetcherMock = observabilitySharedPublic.useFetcher as jest.Mock;
const fetchLatestTestRunMock = fetchLatestTestRun as jest.Mock;

// Sentinel objects used by tests to assert hook plumbing without coupling to
// the full Ping/Monitor shapes.
const localMonitor = {
  id: 'local-monitor-id',
  [ConfigKey.CONFIG_ID]: 'local-cfg',
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: 'custom-hb-id',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
};

// ConfigKey.MONITOR_QUERY_ID === 'id', so this exposes monitor.id for the hook.
const remoteMonitor = {
  [ConfigKey.CONFIG_ID]: 'remote-cfg',
  [ConfigKey.MONITOR_QUERY_ID]: 'remote-query-id',
  [ConfigKey.NAME]: 'Remote monitor',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.TAGS]: [],
  [ConfigKey.LOCATIONS]: [{ id: 'us-east', label: 'US East' }],
  remote: { remoteName: 'remote-a' },
};

describe('useMonitorLatestPing', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    mockUseSelectedLocation.mockReturnValue({ label: 'US East' });
    mockLatestPingState.mockReturnValue({ data: undefined, loading: false, loaded: false });
    useFetcherMock.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.PENDING,
      loading: false,
    });
    fetchLatestTestRunMock.mockResolvedValue({ ping: undefined });
  });

  afterEach(() => jest.clearAllMocks());

  describe('local path (no remoteName)', () => {
    it('dispatches getMonitorLastRunAction with monitorId + locationLabel', () => {
      mockUseSelectedMonitor.mockReturnValue({ monitor: localMonitor });

      renderHook(() => useMonitorLatestPing());

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      const dispatched = mockDispatch.mock.calls[0][0];
      expect(dispatched.type).toBe(getMonitorLastRunAction.get.type);
      expect(dispatched.payload).toEqual({
        monitorId: 'local-monitor-id',
        locationLabel: 'US East',
      });
    });

    it('returns latestPing from Redux when ids and location match', () => {
      mockUseSelectedMonitor.mockReturnValue({ monitor: localMonitor });
      const ping = {
        monitor: { id: 'local-monitor-id' },
        observer: { geo: { name: 'US East' } },
      } as unknown as Ping;
      mockLatestPingState.mockReturnValue({ data: ping, loading: false, loaded: true });

      const { result } = renderHook(() => useMonitorLatestPing());

      expect(result.current.latestPing).toBe(ping);
      expect(result.current.loaded).toBe(true);
    });

    it('accepts the project-monitor CUSTOM_HEARTBEAT_ID as a match for monitor.id', () => {
      mockUseSelectedMonitor.mockReturnValue({ monitor: localMonitor });
      const ping = {
        monitor: { id: 'custom-hb-id' },
        observer: { geo: { name: 'US East' } },
      } as unknown as Ping;
      mockLatestPingState.mockReturnValue({ data: ping, loading: false, loaded: true });

      const { result } = renderHook(() => useMonitorLatestPing());

      expect(result.current.latestPing).toBe(ping);
    });

    it('returns undefined latestPing when the Redux ping is for a different location', () => {
      mockUseSelectedMonitor.mockReturnValue({ monitor: localMonitor });
      const ping = {
        monitor: { id: 'local-monitor-id' },
        observer: { geo: { name: 'EU West' } },
      } as unknown as Ping;
      mockLatestPingState.mockReturnValue({ data: ping, loading: false, loaded: true });

      const { result } = renderHook(() => useMonitorLatestPing());

      expect(result.current.latestPing).toBeUndefined();
    });

    it('does not call the remote latest-ping route', () => {
      mockUseSelectedMonitor.mockReturnValue({ monitor: localMonitor });

      renderHook(() => useMonitorLatestPing());

      // useRemoteMonitorLatestPing is still invoked (rules of hooks), but its
      // fetcher short-circuits without a remoteName so the route is never hit.
      const fetchCallback = useFetcherMock.mock.calls[0][0];
      fetchCallback();
      expect(fetchLatestTestRunMock).not.toHaveBeenCalled();
    });
  });

  describe('remote path (remoteName in URL)', () => {
    beforeEach(() => {
      mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });
      mockUseSelectedMonitor.mockReturnValue({ monitor: remoteMonitor });
    });

    it('does NOT dispatch the local SO-backed action for remote monitors', () => {
      renderHook(() => useMonitorLatestPing());

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('calls the latest-ping route with monitorId, locationLabel, and remoteName', () => {
      renderHook(() => useMonitorLatestPing());

      const fetchCallback = useFetcherMock.mock.calls[0][0];
      fetchCallback();
      expect(fetchLatestTestRunMock).toHaveBeenCalledWith({
        monitorId: 'remote-query-id',
        locationLabel: 'US East',
        remoteName: 'remote-a',
      });
    });

    it('omits the location label when no location is selected', () => {
      mockUseSelectedLocation.mockReturnValue(undefined);

      renderHook(() => useMonitorLatestPing());

      const fetchCallback = useFetcherMock.mock.calls[0][0];
      fetchCallback();
      expect(fetchLatestTestRunMock).toHaveBeenCalledWith({
        monitorId: 'remote-query-id',
        locationLabel: undefined,
        remoteName: 'remote-a',
      });
    });

    it('returns the latest ping from the route result', () => {
      const ping = {
        monitor: { id: 'remote-query-id' },
        observer: { geo: { name: 'US East' } },
        '@timestamp': '2024-01-01T00:00:00Z',
      } as unknown as Ping;
      useFetcherMock.mockReturnValue({
        data: { ping },
        status: FETCH_STATUS.SUCCESS,
        loading: false,
      });

      const { result } = renderHook(() => useMonitorLatestPing());

      expect(result.current.latestPing).toBe(ping);
      expect(result.current.loaded).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('returns undefined latestPing with loaded=true when the route returns no ping', () => {
      useFetcherMock.mockReturnValue({
        data: { ping: undefined },
        status: FETCH_STATUS.SUCCESS,
        loading: false,
      });

      const { result } = renderHook(() => useMonitorLatestPing());

      expect(result.current.latestPing).toBeUndefined();
      expect(result.current.loaded).toBe(true);
    });

    it('keeps loaded=false while useSelectedMonitor has not yet resolved the remote monitor', () => {
      mockUseSelectedMonitor.mockReturnValue({ monitor: undefined });

      const { result } = renderHook(() => useMonitorLatestPing());

      expect(result.current.loading).toBe(true);
      expect(result.current.loaded).toBe(false);
      expect(result.current.latestPing).toBeUndefined();
    });

    it('does not call the route when the monitor has not yet been resolved', () => {
      mockUseSelectedMonitor.mockReturnValue({ monitor: undefined });

      renderHook(() => useMonitorLatestPing());

      const fetchCallback = useFetcherMock.mock.calls[0][0];
      fetchCallback();
      expect(fetchLatestTestRunMock).not.toHaveBeenCalled();
    });

    it('propagates loading=true from the fetcher', () => {
      useFetcherMock.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.LOADING,
        loading: true,
      });

      const { result } = renderHook(() => useMonitorLatestPing());

      expect(result.current.loading).toBe(true);
      expect(result.current.loaded).toBe(false);
    });
  });

  it('mocks react-redux without crashing', () => {
    // Smoke check: react-redux is referenced indirectly so jest setup matches.
    expect(reactRedux.useDispatch).toBeDefined();
  });
});
