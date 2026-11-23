/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { EncryptedSyntheticsMonitorAttributes } from '../../../../common/runtime_types';
import { DeleteMonitorAPI } from './delete_monitor_api';

jest.mock('../edit_monitor', () => ({
  validatePermissions: jest.fn().mockResolvedValue(null),
}));

jest.mock('../monitor_locations_utils', () => ({
  assertCanPerformMonitorBulkActionInAllSpaces: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../telemetry/monitor_upgrade_sender', () => ({
  formatTelemetryDeleteEvent: jest.fn().mockReturnValue({}),
  sendTelemetryEvents: jest.fn(),
  sendErrorTelemetryEvents: jest.fn(),
}));

const mockMonitor = (
  id: string,
  namespaces?: string[],
  type = 'synthetics-monitor'
): SavedObject<EncryptedSyntheticsMonitorAttributes> => ({
  id,
  type,
  references: [],
  ...(namespaces ? { namespaces } : {}),
  attributes: {
    id,
    locations: [{ id: 'loc-1', isServiceManaged: false }],
  } as EncryptedSyntheticsMonitorAttributes,
});

const createMockRouteContext = () => {
  const deleteMonitors = jest.fn().mockResolvedValue([]);
  const bulkDelete = jest.fn().mockResolvedValue({ statuses: [] });
  const getDecrypted = jest.fn();

  return {
    routeContext: {
      request: {} as any,
      response: {
        forbidden: jest.fn((opts: any) => ({ status: 403, ...opts })),
        ok: jest.fn((opts: any) => opts),
      } as any,
      spaceId: 'default',
      server: {
        logger: { error: jest.fn() },
        telemetry: {},
        stackVersion: '9.5.0',
      } as any,
      savedObjectsClient: {} as any,
      syntheticsMonitorClient: {
        deleteMonitors,
      } as any,
      monitorConfigRepository: {
        getDecrypted,
        bulkDelete,
      } as any,
    } as any,
    mocks: { deleteMonitors, bulkDelete, getDecrypted },
  };
};

describe('DeleteMonitorAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { validatePermissions } = jest.requireMock('../edit_monitor');
    const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
      '../monitor_locations_utils'
    );
    validatePermissions.mockResolvedValue(null);
    assertCanPerformMonitorBulkActionInAllSpaces.mockResolvedValue(undefined);
  });

  describe('per-space authorization', () => {
    it('asserts delete privileges in all monitor spaces before deleting', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({
        normalizedMonitor: mockMonitor('mon-1', ['default', 'other-space']),
      });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        ['default', 'other-space'],
        'synthetics-monitor',
        'bulk_delete'
      );
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });

    it('authorizes and deletes provided monitors without loading them again', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const { routeContext, mocks } = createMockRouteContext();
      const monitor = mockMonitor('mon-1', ['default', 'other-space']);

      const api = new DeleteMonitorAPI(routeContext);
      await api.executeWithMonitors({ monitors: [monitor] });

      expect(mocks.getDecrypted).not.toHaveBeenCalled();
      expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        ['default', 'other-space'],
        'synthetics-monitor',
        'bulk_delete'
      );
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });

    it('checks spaces from the saved object namespaces, not the spaces attribute', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const { routeContext, mocks } = createMockRouteContext();
      // Authoritative namespaces include a space the (drifted) attribute would omit.
      const monitor = mockMonitor('mon-1', ['default', 'shared-via-so-api']);
      (monitor.attributes as any).spaces = ['default'];
      mocks.getDecrypted.mockResolvedValue({ normalizedMonitor: monitor });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        ['default', 'shared-via-so-api'],
        'synthetics-monitor',
        'bulk_delete'
      );
    });

    it('handles monitors shared to all spaces', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({ normalizedMonitor: mockMonitor('mon-1', ['*']) });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        ['*'],
        'synthetics-monitor',
        'bulk_delete'
      );
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });

    it('returns the forbidden response and does not delete when a space check fails', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const forbidden = { status: 403, body: { message: 'no access' } };
      assertCanPerformMonitorBulkActionInAllSpaces.mockResolvedValue(forbidden);

      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({
        normalizedMonitor: mockMonitor('mon-1', ['default', 'restricted-space']),
      });

      const api = new DeleteMonitorAPI(routeContext);
      const { res } = await api.execute({ monitorIds: ['mon-1'] });

      expect(res).toBe(forbidden);
      expect(mocks.deleteMonitors).not.toHaveBeenCalled();
      expect(mocks.bulkDelete).not.toHaveBeenCalled();
    });

    it('aborts the whole batch when a later monitor fails the space check', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const forbidden = { status: 403, body: { message: 'no access' } };
      assertCanPerformMonitorBulkActionInAllSpaces
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(forbidden);

      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-1', ['default', 'space-a']) })
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-2', ['default', 'space-b']) });

      const api = new DeleteMonitorAPI(routeContext);
      const { res } = await api.execute({ monitorIds: ['mon-1', 'mon-2'] });

      expect(res).toBe(forbidden);
      expect(mocks.deleteMonitors).not.toHaveBeenCalled();
      expect(mocks.bulkDelete).not.toHaveBeenCalled();
    });

    it('delegates the empty-space early return to the authorization helper', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({ normalizedMonitor: mockMonitor('mon-1') });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        [],
        'synthetics-monitor',
        'bulk_delete'
      );
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });

    it('dedupes the privilege check across monitors sharing the same type and spaces', async () => {
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-1', ['default', 'space-a']) })
        // Same spaces, different order — should still be treated as the same key.
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-2', ['space-a', 'default']) })
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-3', ['default', 'space-b']) });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1', 'mon-2', 'mon-3'] });

      // Two distinct space sets -> two checks, not three.
      expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledTimes(2);
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });
  });

  describe('location permissions', () => {
    it('returns forbidden when validatePermissions fails, without checking spaces', async () => {
      const { validatePermissions } = jest.requireMock('../edit_monitor');
      const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
        '../monitor_locations_utils'
      );
      validatePermissions.mockResolvedValue('Insufficient permissions');

      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({
        normalizedMonitor: mockMonitor('mon-1', ['default', 'other-space']),
      });

      const api = new DeleteMonitorAPI(routeContext);
      const { res } = await api.execute({ monitorIds: ['mon-1'] });

      expect(res).toEqual(expect.objectContaining({ status: 403 }));
      expect(assertCanPerformMonitorBulkActionInAllSpaces).not.toHaveBeenCalled();
      expect(mocks.deleteMonitors).not.toHaveBeenCalled();
    });
  });
});
