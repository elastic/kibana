/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { EncryptedSyntheticsMonitorAttributes } from '../../../../common/runtime_types';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '../../../../common/types/saved_objects';
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
  type = 'synthetics-monitor',
  attributes: Record<string, unknown> = {}
): SavedObject<EncryptedSyntheticsMonitorAttributes> => ({
  id,
  type,
  references: [],
  ...(namespaces ? { namespaces } : {}),
  attributes: {
    id,
    locations: [{ id: 'loc-1', isServiceManaged: false }],
    ...attributes,
  } as EncryptedSyntheticsMonitorAttributes,
});

const createMockRouteContext = () => {
  const deleteMonitors = jest.fn().mockResolvedValue([]);
  const bulkDelete = jest.fn().mockResolvedValue({ statuses: [] });
  const get = jest.fn();
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
        get,
        getDecrypted,
        bulkDelete,
      } as any,
    } as any,
    mocks: { deleteMonitors, bulkDelete, get, getDecrypted },
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
      mocks.get.mockResolvedValue(mockMonitor('mon-1', ['default', 'other-space']));

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

      expect(mocks.get).not.toHaveBeenCalled();
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
      mocks.get.mockResolvedValue(monitor);

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
      mocks.get.mockResolvedValue(mockMonitor('mon-1', ['*']));

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
      mocks.get.mockResolvedValue(mockMonitor('mon-1', ['default', 'restricted-space']));

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
      mocks.get
        .mockResolvedValueOnce(mockMonitor('mon-1', ['default', 'space-a']))
        .mockResolvedValueOnce(mockMonitor('mon-2', ['default', 'space-b']));

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
      mocks.get.mockResolvedValue(mockMonitor('mon-1'));

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
      mocks.get
        .mockResolvedValueOnce(mockMonitor('mon-1', ['default', 'space-a']))
        // Same spaces, different order — should still be treated as the same key.
        .mockResolvedValueOnce(mockMonitor('mon-2', ['space-a', 'default']))
        .mockResolvedValueOnce(mockMonitor('mon-3', ['default', 'space-b']));

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
      mocks.get.mockResolvedValue(mockMonitor('mon-1', ['default', 'other-space']));

      const api = new DeleteMonitorAPI(routeContext);
      const { res } = await api.execute({ monitorIds: ['mon-1'] });

      expect(res).toEqual(expect.objectContaining({ status: 403 }));
      expect(assertCanPerformMonitorBulkActionInAllSpaces).not.toHaveBeenCalled();
      expect(mocks.deleteMonitors).not.toHaveBeenCalled();
    });
  });

  describe('reading the monitors to delete', () => {
    it('reads the monitor as is and never decrypts it', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.get.mockResolvedValue(mockMonitor('mon-1', ['default']));

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(mocks.get).toHaveBeenCalledTimes(1);
      expect(mocks.get).toHaveBeenCalledWith('mon-1');
      expect(mocks.getDecrypted).not.toHaveBeenCalled();
    });

    it('reports a monitor that does not exist without sending anything to delete', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('synthetics-monitor', 'mon-missing')
      );

      const api = new DeleteMonitorAPI(routeContext);
      const { result } = await api.execute({ monitorIds: ['mon-missing'] });

      expect(result).toEqual([
        { id: 'mon-missing', deleted: false, error: 'Monitor id mon-missing not found!' },
      ]);
      expect(mocks.deleteMonitors).toHaveBeenCalledWith([], 'default');
      expect(mocks.bulkDelete).toHaveBeenCalledWith([]);
    });

    it('still deletes the monitors that exist when another one is not found', async () => {
      const { routeContext, mocks } = createMockRouteContext();
      mocks.get.mockImplementation(async (id: string) => {
        if (id === 'mon-missing') {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError('synthetics-monitor', id);
        }
        return mockMonitor(id, ['default']);
      });

      const api = new DeleteMonitorAPI(routeContext);
      const { result } = await api.execute({ monitorIds: ['mon-1', 'mon-missing'] });

      expect(result).toEqual([
        { id: 'mon-missing', deleted: false, error: 'Monitor id mon-missing not found!' },
      ]);
      expect(mocks.deleteMonitors).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 'mon-1' })],
        'default'
      );
      expect(mocks.bulkDelete).toHaveBeenCalledWith([{ id: 'mon-1', type: 'synthetics-monitor' }]);
    });

    it('logs, reports telemetry and fails when the monitor cannot be read', async () => {
      const { sendErrorTelemetryEvents } = jest.requireMock(
        '../../telemetry/monitor_upgrade_sender'
      );
      const { routeContext, mocks } = createMockRouteContext();
      mocks.get.mockRejectedValue(Object.assign(new Error('es is down'), { status: 503 }));

      const api = new DeleteMonitorAPI(routeContext);

      await expect(api.execute({ monitorIds: ['mon-1'] })).rejects.toThrow(/es is down/);
      expect(routeContext.server.logger.error).toHaveBeenCalledWith(
        'Failed to read monitor to delete, monitor id: mon-1',
        { error: expect.objectContaining({ message: 'es is down' }) }
      );
      expect(sendErrorTelemetryEvents).toHaveBeenCalledWith(
        routeContext.server.logger,
        routeContext.server.telemetry,
        expect.objectContaining({
          type: 'deletionError',
          reason: 'Failed to read monitor to delete mon-1',
          status: 503,
        })
      );
      expect(mocks.deleteMonitors).not.toHaveBeenCalled();
      expect(mocks.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe('what is deleted', () => {
    it('deletes a monitor from every location it runs in, keyed by its query id', async () => {
      const locations = [
        { id: 'us_central', isServiceManaged: true },
        { id: 'us_east', isServiceManaged: true },
        { id: 'my-private-location', isServiceManaged: false },
      ];
      const { routeContext, mocks } = createMockRouteContext();
      mocks.get.mockResolvedValue(
        mockMonitor('so-id-1', ['default'], 'synthetics-monitor', { id: 'query-id-1', locations })
      );

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['so-id-1'] });

      expect(mocks.deleteMonitors).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 'query-id-1', locations })],
        'default'
      );
      expect(mocks.bulkDelete).toHaveBeenCalledWith([
        { id: 'so-id-1', type: 'synthetics-monitor' },
      ]);
    });

    it('deletes a monitor that only runs in a private location', async () => {
      const locations = [{ id: 'my-private-location', isServiceManaged: false }];
      const { routeContext, mocks } = createMockRouteContext();
      mocks.get.mockResolvedValue(
        mockMonitor('mon-1', ['default'], 'synthetics-monitor', { locations })
      );

      const api = new DeleteMonitorAPI(routeContext);
      await api.execute({ monitorIds: ['mon-1'] });

      expect(mocks.deleteMonitors).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 'mon-1', locations })],
        'default'
      );
    });

    it.each([syntheticsMonitorSavedObjectType, legacySyntheticsMonitorTypeSingle])(
      'deletes the monitor with the saved object type it was read as (%s)',
      async (type) => {
        const { routeContext, mocks } = createMockRouteContext();
        mocks.get.mockResolvedValue(mockMonitor('mon-1', undefined, type));

        const api = new DeleteMonitorAPI(routeContext);
        await api.execute({ monitorIds: ['mon-1'] });

        expect(mocks.bulkDelete).toHaveBeenCalledWith([{ id: 'mon-1', type }]);
      }
    );
  });

  describe('delete telemetry', () => {
    it.each([
      ['a browser monitor created in the UI', { type: 'browser', origin: 'ui' }, true],
      ['a browser monitor without an origin', { type: 'browser' }, true],
      ['an API monitor created in the UI', { type: 'api', origin: 'ui' }, true],
      ['a browser monitor pushed from a project', { type: 'browser', origin: 'project' }, false],
      ['an http monitor', { type: 'http', origin: 'ui' }, false],
      ['a tcp monitor', { type: 'tcp' }, false],
    ])(
      'derives the inline script flag without the encrypted script for %s',
      async (_label, attributes, isInlineScript) => {
        const { formatTelemetryDeleteEvent } = jest.requireMock(
          '../../telemetry/monitor_upgrade_sender'
        );
        const { routeContext, mocks } = createMockRouteContext();
        const monitor = mockMonitor('mon-1', ['default'], 'synthetics-monitor', attributes);
        mocks.get.mockResolvedValue(monitor);

        const api = new DeleteMonitorAPI(routeContext);
        await api.execute({ monitorIds: ['mon-1'] });

        expect(formatTelemetryDeleteEvent).toHaveBeenCalledWith(
          monitor,
          '9.5.0',
          expect.any(String),
          isInlineScript,
          []
        );
      }
    );
  });
});
