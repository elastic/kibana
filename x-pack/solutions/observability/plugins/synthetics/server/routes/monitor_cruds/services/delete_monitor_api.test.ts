/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeleteMonitorAPI } from './delete_monitor_api';

jest.mock('../edit_monitor', () => ({
  validatePermissions: jest.fn().mockResolvedValue(null),
}));

jest.mock('../monitor_locations_utils', () => ({
  assertCanUpdateMonitorInAllSpaces: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../telemetry/monitor_upgrade_sender', () => ({
  formatTelemetryDeleteEvent: jest.fn().mockReturnValue({}),
  sendTelemetryEvents: jest.fn(),
  sendErrorTelemetryEvents: jest.fn(),
}));

const mockMonitor = (id: string, namespaces?: string[], type = 'synthetics-monitor') => ({
  id,
  type,
  references: [],
  ...(namespaces ? { namespaces } : {}),
  attributes: {
    id,
    locations: [{ id: 'loc-1', isServiceManaged: false }],
  },
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
    const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
    validatePermissions.mockResolvedValue(null);
    assertCanUpdateMonitorInAllSpaces.mockResolvedValue(undefined);
  });

  describe('per-space authorization', () => {
    it('asserts update privileges in all monitor spaces before deleting', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({
        normalizedMonitor: mockMonitor('mon-1', ['default', 'other-space']),
      });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanUpdateMonitorInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        ['default', 'other-space'],
        'synthetics-monitor'
      );
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });

    it('checks spaces from the saved object namespaces, not the spaces attribute', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      const { routeContext, mocks } = createMockRouteContext();
      // Authoritative namespaces include a space the (drifted) attribute would omit.
      const monitor = mockMonitor('mon-1', ['default', 'shared-via-so-api']);
      (monitor.attributes as any).spaces = ['default'];
      mocks.getDecrypted.mockResolvedValue({ normalizedMonitor: monitor });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanUpdateMonitorInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        ['default', 'shared-via-so-api'],
        'synthetics-monitor'
      );
    });

    it('handles monitors shared to all spaces', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({ normalizedMonitor: mockMonitor('mon-1', ['*']) });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanUpdateMonitorInAllSpaces).toHaveBeenCalledWith(
        routeContext,
        ['*'],
        'synthetics-monitor'
      );
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });

    it('returns the forbidden response and does not delete when a space check fails', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      const forbidden = { status: 403, body: { message: 'no access' } };
      assertCanUpdateMonitorInAllSpaces.mockResolvedValue(forbidden);

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
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      const forbidden = { status: 403, body: { message: 'no access' } };
      assertCanUpdateMonitorInAllSpaces
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

    it('skips the space check for monitors without shared spaces', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({ normalizedMonitor: mockMonitor('mon-1') });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(assertCanUpdateMonitorInAllSpaces).not.toHaveBeenCalled();
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });

    it('dedupes the privilege check across monitors sharing the same type and spaces', async () => {
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-1', ['default', 'space-a']) })
        // Same spaces, different order — should still be treated as the same key.
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-2', ['space-a', 'default']) })
        .mockResolvedValueOnce({ normalizedMonitor: mockMonitor('mon-3', ['default', 'space-b']) });

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1', 'mon-2', 'mon-3'] });

      // Two distinct space sets -> two checks, not three.
      expect(assertCanUpdateMonitorInAllSpaces).toHaveBeenCalledTimes(2);
      expect(mocks.deleteMonitors).toHaveBeenCalledTimes(1);
    });
  });

  describe('location permissions', () => {
    it('returns forbidden when validatePermissions fails, without checking spaces', async () => {
      const { validatePermissions } = jest.requireMock('../edit_monitor');
      const { assertCanUpdateMonitorInAllSpaces } = jest.requireMock('../monitor_locations_utils');
      validatePermissions.mockResolvedValue('Insufficient permissions');

      const { routeContext, mocks } = createMockRouteContext();
      mocks.getDecrypted.mockResolvedValue({
        normalizedMonitor: mockMonitor('mon-1', ['default', 'other-space']),
      });

      const api = new DeleteMonitorAPI(routeContext);
      const { res } = await api.execute({ monitorIds: ['mon-1'] });

      expect(res).toEqual(expect.objectContaining({ status: 403 }));
      expect(assertCanUpdateMonitorInAllSpaces).not.toHaveBeenCalled();
      expect(mocks.deleteMonitors).not.toHaveBeenCalled();
    });
  });
});
