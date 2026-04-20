/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import * as reactRedux from 'react-redux';
import { PrivateLocationHealthStatusValue } from '../../../../../../common/runtime_types';
import { useMonitorIntegrationHealth } from './use_monitor_integration_health';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../state/monitor_management/api', () => ({
  resetMonitorAPI: jest.fn(),
  resetMonitorBulkAPI: jest.fn(),
}));

import { resetMonitorAPI, resetMonitorBulkAPI } from '../../../state/monitor_management/api';

const mockedResetMonitorAPI = resetMonitorAPI as jest.MockedFunction<typeof resetMonitorAPI>;
const mockedResetMonitorBulkAPI = resetMonitorBulkAPI as jest.MockedFunction<
  typeof resetMonitorBulkAPI
>;

const healthyMonitor = {
  configId: 'mon-1',
  monitorName: 'Monitor 1',
  isHealthy: true,
  privateLocations: [
    {
      locationId: 'loc-1',
      locationLabel: 'Location 1',
      status: PrivateLocationHealthStatusValue.Healthy,
      packagePolicyId: 'mon-1-loc-1',
    },
  ],
};

const unhealthyMonitor = {
  configId: 'mon-2',
  monitorName: 'Monitor 2',
  isHealthy: false,
  privateLocations: [
    {
      locationId: 'loc-1',
      locationLabel: 'Location 1',
      status: PrivateLocationHealthStatusValue.MissingPackagePolicy,
      packagePolicyId: 'mon-2-loc-1',
      reason: 'Missing',
    },
    {
      locationId: 'loc-2',
      locationLabel: 'Location 2',
      status: PrivateLocationHealthStatusValue.Healthy,
      packagePolicyId: 'mon-2-loc-2',
    },
  ],
};

const setupSelectors = (healthData: { monitors: (typeof healthyMonitor)[]; errors: unknown[] }) => {
  (reactRedux.useSelector as jest.Mock).mockImplementation((selector: any) => {
    const fakeState = {
      monitorList: {
        data: { monitors: [] },
        loaded: true,
        loading: false,
      },
      monitorHealth: {
        data: healthData,
        loading: false,
        loaded: true,
        error: null,
      },
    };
    return selector(fakeState);
  });
};

describe('useMonitorIntegrationHealth', () => {
  let dispatchSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatchSpy = jest.fn();
    (reactRedux.useDispatch as jest.Mock).mockReturnValue(dispatchSpy);
  });

  describe('status helpers', () => {
    it('isUnhealthy returns true for unhealthy monitors', () => {
      setupSelectors({ monitors: [healthyMonitor, unhealthyMonitor], errors: [] });

      const { result } = renderHook(() =>
        useMonitorIntegrationHealth({ configIds: ['mon-1', 'mon-2'] })
      );

      expect(result.current.isUnhealthy('mon-1')).toBe(false);
      expect(result.current.isUnhealthy('mon-2')).toBe(true);
      expect(result.current.isUnhealthy('non-existent')).toBe(false);
    });

    it('getUnhealthyLocationStatuses returns only unhealthy locations', () => {
      setupSelectors({ monitors: [unhealthyMonitor], errors: [] });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-2'] }));

      const statuses = result.current.getUnhealthyLocationStatuses('mon-2');
      expect(statuses).toHaveLength(1);
      expect(statuses[0].locationId).toBe('loc-1');
      expect(statuses[0].status).toBe(PrivateLocationHealthStatusValue.MissingPackagePolicy);
    });

    it('getUnhealthyMonitorCountForLocation counts monitors with unhealthy status at that location', () => {
      setupSelectors({ monitors: [healthyMonitor, unhealthyMonitor], errors: [] });

      const { result } = renderHook(() =>
        useMonitorIntegrationHealth({ configIds: ['mon-1', 'mon-2'] })
      );

      expect(result.current.getUnhealthyMonitorCountForLocation('loc-1')).toBe(1);
      expect(result.current.getUnhealthyMonitorCountForLocation('loc-2')).toBe(0);
    });

    it('getUnhealthyConfigIdsForLocation returns config IDs of unhealthy monitors', () => {
      setupSelectors({ monitors: [healthyMonitor, unhealthyMonitor], errors: [] });

      const { result } = renderHook(() =>
        useMonitorIntegrationHealth({ configIds: ['mon-1', 'mon-2'] })
      );

      expect(result.current.getUnhealthyConfigIdsForLocation('loc-1')).toEqual(['mon-2']);
    });
  });

  describe('resetMonitor', () => {
    it('calls resetMonitorAPI and re-fetches health', async () => {
      setupSelectors({ monitors: [unhealthyMonitor], errors: [] });
      mockedResetMonitorAPI.mockResolvedValue({ id: 'mon-2', reset: true });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-2'] }));

      let resetResult: { error?: Error } | undefined;
      await act(async () => {
        resetResult = await result.current.resetMonitor('mon-2');
      });

      expect(resetResult).toEqual({});
      expect(mockedResetMonitorAPI).toHaveBeenCalledWith({ id: 'mon-2' });
      expect(result.current.isResetting).toBe(false);
      const healthDispatches = dispatchSpy.mock.calls.filter(
        ([action]: any) => action.type === '[MONITOR HEALTH] GET'
      );
      expect(healthDispatches.length).toBeGreaterThanOrEqual(2);
    });

    it('returns error and sets isResetting to false on API failure', async () => {
      setupSelectors({ monitors: [unhealthyMonitor], errors: [] });
      mockedResetMonitorAPI.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-2'] }));

      let resetResult: { error?: Error } | undefined;
      await act(async () => {
        resetResult = await result.current.resetMonitor('mon-2');
      });

      expect(resetResult?.error).toBeInstanceOf(Error);
      expect(resetResult?.error?.message).toBe('Server error');
      expect(result.current.isResetting).toBe(false);
    });
  });

  describe('resetMonitors (bulk)', () => {
    it('returns error and does not refetch when a result item has reset: false', async () => {
      setupSelectors({ monitors: [unhealthyMonitor], errors: [] });
      mockedResetMonitorBulkAPI.mockResolvedValue({
        result: [{ id: 'mon-2', reset: false, error: 'fleet error' }],
      });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-2'] }));

      let resetResult: { error?: Error } | undefined;
      await act(async () => {
        resetResult = await result.current.resetMonitors(['mon-2']);
      });

      expect(resetResult?.error).toBeInstanceOf(Error);
      expect(result.current.isResetting).toBe(false);
      const healthDispatches = dispatchSpy.mock.calls.filter(
        ([action]: any) => action.type === '[MONITOR HEALTH] GET'
      );
      expect(healthDispatches.length).toBe(1); // only initial fetch, no refetch
    });

    it('returns error and does not refetch when top-level errors are present', async () => {
      setupSelectors({ monitors: [unhealthyMonitor], errors: [] });
      mockedResetMonitorBulkAPI.mockResolvedValue({
        result: [{ id: 'mon-2', reset: false }],
      });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-2'] }));

      let resetResult: { error?: Error } | undefined;
      await act(async () => {
        resetResult = await result.current.resetMonitors(['mon-2']);
      });

      expect(resetResult?.error).toBeInstanceOf(Error);
      expect(result.current.isResetting).toBe(false);
    });

    it('calls resetMonitorBulkAPI and re-fetches health', async () => {
      setupSelectors({ monitors: [unhealthyMonitor], errors: [] });
      mockedResetMonitorBulkAPI.mockResolvedValue({
        result: [{ id: 'mon-2', reset: true }],
      });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-2'] }));

      let resetResult: { error?: Error } | undefined;
      await act(async () => {
        resetResult = await result.current.resetMonitors(['mon-2']);
      });

      expect(resetResult).toEqual({});
      expect(mockedResetMonitorBulkAPI).toHaveBeenCalledWith({ ids: ['mon-2'] });
      expect(result.current.isResetting).toBe(false);
    });
  });
});
