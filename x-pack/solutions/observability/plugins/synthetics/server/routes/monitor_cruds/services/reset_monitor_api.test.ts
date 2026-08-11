/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ResetMonitorAPI } from './reset_monitor_api';

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn().mockResolvedValue([]),
}));

jest.mock('../edit_monitor', () => ({
  validatePermissions: jest.fn().mockResolvedValue(null),
}));

const mockMonitorPairWithLocations = (
  id: string,
  locations: Array<{ id: string; isServiceManaged: boolean }>
) => ({
  decryptedMonitor: {
    id,
    attributes: { locations, id },
    type: 'synthetics-monitor',
    references: [],
  },
  normalizedMonitor: {
    id,
    attributes: { locations, id },
    type: 'synthetics-monitor',
    references: [],
    updated_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
});

const mockMonitorPair = (id: string) => ({
  decryptedMonitor: {
    id,
    attributes: {
      locations: [{ id: 'loc-1', isServiceManaged: false }],
      id,
    },
    type: 'synthetics-monitor',
    references: [],
  },
  normalizedMonitor: {
    id,
    attributes: {
      locations: [{ id: 'loc-1', isServiceManaged: false }],
      id,
    },
    type: 'synthetics-monitor',
    references: [],
    updated_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
});

const createMockRouteContextWithFleet = (existingAgentPolicyIds: string[]) => {
  const base = createMockRouteContext();
  const getByIds = jest.fn().mockResolvedValue(existingAgentPolicyIds.map((id) => ({ id })));
  base.routeContext.server = {
    ...base.routeContext.server,
    fleet: { agentPolicyService: { getByIds } },
    coreStart: { savedObjects: { createInternalRepository: jest.fn().mockReturnValue({}) } },
  } as any;
  return { ...base, mocks: { ...base.mocks, getByIds } };
};

const createMockRouteContext = () => {
  const editMonitors = jest.fn().mockResolvedValue({
    failedPolicyUpdates: [],
    publicSyncErrors: [],
  });
  const deleteMonitors = jest.fn().mockResolvedValue([]);
  const addMonitors = jest.fn().mockResolvedValue([[], []]);
  const getDecrypted = jest.fn();

  return {
    routeContext: {
      request: {} as any,
      response: {
        forbidden: jest.fn((opts: any) => opts),
        ok: jest.fn((opts: any) => opts),
        notFound: jest.fn((opts: any) => opts),
        customError: jest.fn((opts: any) => opts),
      } as any,
      spaceId: 'default',
      server: {
        logger: { error: jest.fn() },
      } as any,
      savedObjectsClient: {} as any,
      syntheticsMonitorClient: {
        editMonitors,
        deleteMonitors,
        addMonitors,
      } as any,
      monitorConfigRepository: {
        getDecrypted,
      } as any,
    } as any,
    mocks: { editMonitors, deleteMonitors, addMonitors, getDecrypted },
  };
};

describe('ResetMonitorAPI', () => {
  describe('getMonitorsToReset', () => {
    it('returns decrypted monitors for valid IDs', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue(mockMonitorPair('mon-1'));

      const api = new ResetMonitorAPI(routeContext);
      const monitors = await api.getMonitorsToReset(['mon-1']);

      expect(monitors).toHaveLength(1);
      expect(monitors[0].normalizedMonitor.id).toBe('mon-1');
    });

    it('pushes error for 404 monitors without throwing', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('synthetics-monitor', 'missing-id')
      );

      const api = new ResetMonitorAPI(routeContext);
      const monitors = await api.getMonitorsToReset(['missing-id']);

      expect(monitors).toHaveLength(0);
      expect(api.result).toHaveLength(1);
      expect(api.result[0]).toEqual(expect.objectContaining({ id: 'missing-id', reset: false }));
      expect(api.result[0].error).toContain('not found');
    });

    it('handles mixed valid and invalid IDs', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted
        .mockResolvedValueOnce(mockMonitorPair('mon-1'))
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError('synthetics-monitor', 'bad-id')
        );

      const api = new ResetMonitorAPI(routeContext);
      const monitors = await api.getMonitorsToReset(['mon-1', 'bad-id']);

      expect(monitors).toHaveLength(1);
      expect(monitors[0].normalizedMonitor.id).toBe('mon-1');
      expect(api.result).toHaveLength(1);
      expect(api.result[0].id).toBe('bad-id');
    });
  });

  describe('execute — default mode', () => {
    it('calls editMonitors with collected monitors', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue(mockMonitorPair('mon-1'));

      const api = new ResetMonitorAPI(routeContext);
      const { result } = await api.execute({ monitorIds: ['mon-1'] });

      expect(mocks.editMonitors).toHaveBeenCalledTimes(1);
      expect(mocks.deleteMonitors).not.toHaveBeenCalled();
      expect(mocks.addMonitors).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'mon-1', reset: true }]);
    });

    it('collects per-monitor results for batch', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted
        .mockResolvedValueOnce(mockMonitorPair('mon-1'))
        .mockResolvedValueOnce(mockMonitorPair('mon-2'));

      const api = new ResetMonitorAPI(routeContext);
      const { result } = await api.execute({ monitorIds: ['mon-1', 'mon-2'] });

      expect(result).toHaveLength(2);
      expect(result.every((r: any) => r.reset === true)).toBe(true);
    });

    it('returns errors from editMonitors', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue(mockMonitorPair('mon-1'));
      mocks.editMonitors.mockResolvedValue({
        failedPolicyUpdates: [{ error: { message: 'Fleet error' } }],
        publicSyncErrors: [],
      });

      const api = new ResetMonitorAPI(routeContext);
      const { errors } = await api.execute({ monitorIds: ['mon-1'] });

      expect(errors).toBeDefined();
      expect(errors).toHaveLength(1);
    });
  });

  describe('execute — force mode', () => {
    it('calls deleteMonitors then addMonitors', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue(mockMonitorPair('mon-1'));

      const api = new ResetMonitorAPI(routeContext, true);
      const { result } = await api.execute({ monitorIds: ['mon-1'] });

      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
      expect(mocks.addMonitors).toHaveBeenCalledTimes(1);
      expect(mocks.editMonitors).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'mon-1', reset: true }]);
    });
  });

  describe('authorization', () => {
    it('skips unauthorized monitors and records per-item errors', async () => {
      const { validatePermissions } = jest.requireMock('../edit_monitor');
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted
        .mockResolvedValueOnce(mockMonitorPair('allowed'))
        .mockResolvedValueOnce(mockMonitorPair('blocked'));

      validatePermissions
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('Insufficient permissions');

      const api = new ResetMonitorAPI(routeContext);
      const { result } = await api.execute({ monitorIds: ['allowed', 'blocked'] });

      expect(result).toHaveLength(2);
      const allowedResult = result.find((r: any) => r.id === 'allowed');
      const blockedResult = result.find((r: any) => r.id === 'blocked');
      expect(allowedResult?.reset).toBe(true);
      expect(blockedResult?.reset).toBe(false);
      expect(blockedResult?.error).toBe('Insufficient permissions');
    });

    it('returns empty results when all monitors are unauthorized', async () => {
      const { validatePermissions } = jest.requireMock('../edit_monitor');
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue(mockMonitorPair('blocked'));
      validatePermissions.mockResolvedValue('Insufficient permissions');

      const api = new ResetMonitorAPI(routeContext);
      const { result } = await api.execute({ monitorIds: ['blocked'] });

      expect(result).toHaveLength(1);
      expect(result[0].reset).toBe(false);
      expect(mocks.editMonitors).not.toHaveBeenCalled();
    });
  });

  describe('location filtering — getLocationIdsWithExistingAgentPolicy', () => {
    const { getPrivateLocations } = jest.requireMock(
      '../../../synthetics_service/get_private_locations'
    );

    beforeEach(() => {
      const { validatePermissions } = jest.requireMock('../edit_monitor');
      validatePermissions.mockResolvedValue(null);
    });

    afterEach(() => {
      getPrivateLocations.mockResolvedValue([]);
    });

    it('excludes private locations whose agent policy no longer exists', async () => {
      getPrivateLocations.mockResolvedValue([
        { id: 'loc-valid', agentPolicyId: 'ap-1' },
        { id: 'loc-deleted', agentPolicyId: 'ap-2' },
      ]);
      const { routeContext, mocks } = createMockRouteContextWithFleet(['ap-1']);
      mocks.getDecrypted.mockResolvedValue(
        mockMonitorPairWithLocations('mon-1', [
          { id: 'loc-valid', isServiceManaged: false },
          { id: 'loc-deleted', isServiceManaged: false },
        ])
      );

      const api = new ResetMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      const passedLocations = mocks.editMonitors.mock.calls[0][0][0].monitor.locations;
      expect(passedLocations).toHaveLength(1);
      expect(passedLocations[0].id).toBe('loc-valid');
    });

    it('excludes private locations with no agentPolicyId', async () => {
      getPrivateLocations.mockResolvedValue([{ id: 'loc-no-policy', agentPolicyId: null }]);
      const { routeContext, mocks } = createMockRouteContextWithFleet([]);
      mocks.getDecrypted.mockResolvedValue(
        mockMonitorPairWithLocations('mon-1', [{ id: 'loc-no-policy', isServiceManaged: false }])
      );

      const api = new ResetMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      const passedLocations = mocks.editMonitors.mock.calls[0][0][0].monitor.locations;
      expect(passedLocations).toHaveLength(0);
    });
  });

  describe('empty input', () => {
    it('returns empty results for empty monitorIds', async () => {
      const { routeContext, mocks } = createMockRouteContext();

      const api = new ResetMonitorAPI(routeContext);
      const { result } = await api.execute({ monitorIds: [] });

      expect(result).toEqual([]);
      expect(mocks.editMonitors).not.toHaveBeenCalled();
    });
  });
});
