/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMonitorPings } from './use_monitor_pings';
import { ConfigKey, MonitorTypeEnum } from '../../../../../../common/runtime_types';
import { getMonitorRecentPingsAction } from '../../../state';

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
const mockPingsState = jest.fn();
const mockStatusFilter = jest.fn();
let mockSelectorCallIndex = 0;
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    // useMonitorPings calls useSelector twice per render in a fixed order:
    //  1) selectStatusFilter
    //  2) selectMonitorPingsMetadata
    // We alternate by call index (mod 2) so re-renders keep getting the
    // right shape without coupling to the reselect-wrapped selector refs.
    useSelector: () => {
      const idx = mockSelectorCallIndex++;
      return idx % 2 === 0 ? mockStatusFilter() : mockPingsState();
    },
  };
});

const localMonitor = {
  id: 'local-monitor-id',
  [ConfigKey.CONFIG_ID]: 'local-cfg',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
};

const remoteMonitor = {
  [ConfigKey.CONFIG_ID]: 'remote-cfg',
  [ConfigKey.MONITOR_QUERY_ID]: 'remote-query-id',
  [ConfigKey.NAME]: 'Remote monitor',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.TAGS]: [],
  [ConfigKey.LOCATIONS]: [{ id: 'us-east', label: 'US East' }],
  remote: { remoteName: 'remote-a' },
};

describe('useMonitorPings', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    mockUseSelectedLocation.mockReturnValue({ label: 'US East' });
    mockPingsState.mockReturnValue({ total: 0, data: [], loading: false });
    mockStatusFilter.mockReturnValue(undefined);
    mockSelectorCallIndex = 0;
  });

  afterEach(() => jest.clearAllMocks());

  it('does not dispatch until monitorId and locationLabel are both known', () => {
    mockUseSelectedMonitor.mockReturnValue({ monitor: undefined });

    renderHook(() => useMonitorPings());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches without remoteName for local monitors', () => {
    mockUseSelectedMonitor.mockReturnValue({ monitor: localMonitor });

    renderHook(() => useMonitorPings({ pageSize: 10, pageIndex: 0 }));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatched = mockDispatch.mock.calls[0][0];
    expect(dispatched.type).toBe(getMonitorRecentPingsAction.get.type);
    expect(dispatched.payload).toEqual(
      expect.objectContaining({
        monitorId: 'local-monitor-id',
        locationId: 'US East',
        size: 10,
        pageIndex: 0,
        remoteName: undefined,
      })
    );
  });

  it('dispatches with remoteName for remote monitors', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });
    mockUseSelectedMonitor.mockReturnValue({ monitor: remoteMonitor });

    renderHook(() => useMonitorPings());

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatched = mockDispatch.mock.calls[0][0];
    expect(dispatched.type).toBe(getMonitorRecentPingsAction.get.type);
    expect(dispatched.payload).toEqual(
      expect.objectContaining({
        monitorId: 'remote-query-id',
        locationId: 'US East',
        remoteName: 'remote-a',
      })
    );
  });

  it('forwards the redux pings metadata to the caller', () => {
    mockUseSelectedMonitor.mockReturnValue({ monitor: localMonitor });
    mockPingsState.mockReturnValue({
      total: 7,
      data: [{ docId: 'd1' }, { docId: 'd2' }],
      loading: true,
    });

    const { result } = renderHook(() => useMonitorPings());

    expect(result.current.total).toBe(7);
    expect(result.current.loading).toBe(true);
    expect(result.current.pings).toEqual([{ docId: 'd1' }, { docId: 'd2' }]);
  });
});
