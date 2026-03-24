/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import * as reactRedux from 'react-redux';
import { LocationHealthStatusValue } from '../../../../../../common/runtime_types';
import { useMonitorIntegrationHealth, isAgentLevelIssue } from './use_monitor_integration_health';

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
  isUnhealthy: false,
  locations: [
    {
      locationId: 'loc-1',
      locationLabel: 'Location 1',
      status: LocationHealthStatusValue.Healthy,
      policyId: 'mon-1-loc-1',
    },
  ],
};

const unhealthyMonitor = {
  configId: 'mon-2',
  monitorName: 'Monitor 2',
  isUnhealthy: true,
  locations: [
    {
      locationId: 'loc-1',
      locationLabel: 'Location 1',
      status: LocationHealthStatusValue.MissingPackagePolicy,
      policyId: 'mon-2-loc-1',
      reason: 'Missing',
    },
    {
      locationId: 'loc-2',
      locationLabel: 'Location 2',
      status: LocationHealthStatusValue.Healthy,
      policyId: 'mon-2-loc-2',
    },
  ],
};

const agentOnlyMonitor = {
  configId: 'mon-3',
  monitorName: 'Monitor 3',
  isUnhealthy: true,
  locations: [
    {
      locationId: 'loc-1',
      locationLabel: 'Location 1',
      status: LocationHealthStatusValue.MissingAgents,
      policyId: 'mon-3-loc-1',
      reason: 'No agents',
    },
    {
      locationId: 'loc-2',
      locationLabel: 'Location 2',
      status: LocationHealthStatusValue.UnhealthyAgent,
      policyId: 'mon-3-loc-2',
      reason: 'All offline',
    },
  ],
};

const mixedIssueMonitor = {
  configId: 'mon-4',
  monitorName: 'Monitor 4',
  isUnhealthy: true,
  locations: [
    {
      locationId: 'loc-1',
      locationLabel: 'Location 1',
      status: LocationHealthStatusValue.MissingAgents,
      policyId: 'mon-4-loc-1',
      reason: 'No agents',
    },
    {
      locationId: 'loc-2',
      locationLabel: 'Location 2',
      status: LocationHealthStatusValue.MissingPackagePolicy,
      policyId: 'mon-4-loc-2',
      reason: 'Missing policy',
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
      expect(statuses[0].status).toBe(LocationHealthStatusValue.MissingPackagePolicy);
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

  describe('isAgentLevelIssue', () => {
    it('returns true for MissingAgents', () => {
      expect(isAgentLevelIssue(LocationHealthStatusValue.MissingAgents)).toBe(true);
    });

    it('returns true for UnhealthyAgent', () => {
      expect(isAgentLevelIssue(LocationHealthStatusValue.UnhealthyAgent)).toBe(true);
    });

    it('returns true for MissingAgentPolicy', () => {
      expect(isAgentLevelIssue(LocationHealthStatusValue.MissingAgentPolicy)).toBe(true);
    });

    it('returns false for config-level statuses', () => {
      expect(isAgentLevelIssue(LocationHealthStatusValue.MissingPackagePolicy)).toBe(false);
      expect(isAgentLevelIssue(LocationHealthStatusValue.AgentPolicyMismatch)).toBe(false);
      expect(isAgentLevelIssue(LocationHealthStatusValue.MissingLocation)).toBe(false);
      expect(isAgentLevelIssue(LocationHealthStatusValue.Healthy)).toBe(false);
    });
  });

  describe('canResetFix', () => {
    it('returns true when at least one unhealthy location has a config-fixable issue', () => {
      setupSelectors({ monitors: [unhealthyMonitor], errors: [] });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-2'] }));

      expect(result.current.canResetFix('mon-2')).toBe(true);
    });

    it('returns false when all unhealthy locations have agent-level issues', () => {
      setupSelectors({ monitors: [agentOnlyMonitor], errors: [] });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-3'] }));

      expect(result.current.canResetFix('mon-3')).toBe(false);
    });

    it('returns true when unhealthy locations are mixed (agent + config)', () => {
      setupSelectors({ monitors: [mixedIssueMonitor], errors: [] });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-4'] }));

      expect(result.current.canResetFix('mon-4')).toBe(true);
    });

    it('returns false for an unknown configId', () => {
      setupSelectors({ monitors: [], errors: [] });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: [] }));

      expect(result.current.canResetFix('non-existent')).toBe(false);
    });
  });

  describe('getResetFixableUnhealthyStatuses', () => {
    it('returns only config-fixable unhealthy locations', () => {
      setupSelectors({ monitors: [mixedIssueMonitor], errors: [] });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-4'] }));

      const fixable = result.current.getResetFixableUnhealthyStatuses('mon-4');
      expect(fixable).toHaveLength(1);
      expect(fixable[0].locationId).toBe('loc-2');
      expect(fixable[0].status).toBe(LocationHealthStatusValue.MissingPackagePolicy);
    });

    it('returns empty array for agent-only issues', () => {
      setupSelectors({ monitors: [agentOnlyMonitor], errors: [] });

      const { result } = renderHook(() => useMonitorIntegrationHealth({ configIds: ['mon-3'] }));

      expect(result.current.getResetFixableUnhealthyStatuses('mon-3')).toHaveLength(0);
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
        result: [{ id: 'mon-2', reset: true }],
        errors: [{ message: 'partial failure' }],
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
