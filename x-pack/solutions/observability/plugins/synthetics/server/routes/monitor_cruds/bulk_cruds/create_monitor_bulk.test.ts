/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { MAX_MONITOR_FANOUT_SIZE } from '../../zod_query';
import { MonitorValidationError } from '../monitor_validation';
import { createSyntheticsMonitorBulkRoute } from './create_monitor_bulk';

jest.mock('../services/create_monitor_bulk_api', () => ({
  CreateMonitorBulkAPI: jest.fn(),
}));

jest.mock('./add_monitor_bulk', () => ({
  syncNewMonitorBulk: jest.fn(),
}));

const mockResponse = () => {
  const badRequest = jest.fn((opts: any) => ({ status: 400, ...opts }));
  const forbidden = jest.fn((opts: any) => ({ status: 403, ...opts }));
  const customError = jest.fn((opts: any) => ({ status: opts.statusCode, ...opts }));
  return { badRequest, forbidden, customError };
};

const monitor = {
  type: 'http',
  url: 'https://example.com',
  locations: ['dev'],
};

const mockRouteContext = (response = mockResponse()) =>
  ({
    request: { body: { monitors: [monitor] } },
    response,
    spaceId: 'default',
    server: { logger: { error: jest.fn() } },
  } as any);

const installPreprocessResult = (result: unknown) => {
  const { CreateMonitorBulkAPI } = jest.requireMock('../services/create_monitor_bulk_api');
  const validateRequestedSpacesAccess = jest.fn().mockResolvedValue(undefined);
  const prepare = jest.fn().mockResolvedValue(result);
  const validateCreateAccess = jest.fn().mockResolvedValue(undefined);
  CreateMonitorBulkAPI.mockImplementation(() => ({
    validateRequestedSpacesAccess,
    prepare,
    validateCreateAccess,
  }));
  return { validateRequestedSpacesAccess, prepare, validateCreateAccess };
};

const installSyncResult = (result: unknown) => {
  const { syncNewMonitorBulk } = jest.requireMock('./add_monitor_bulk');
  syncNewMonitorBulk.mockResolvedValue(result);
  return syncNewMonitorBulk;
};

describe('createSyntheticsMonitorBulkRoute', () => {
  const route = createSyntheticsMonitorBulkRoute();
  const bodySchema = (route.validation as { request: { body: z.ZodType } }).request.body;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses POST on the public bulk-create path', () => {
    expect(route.method).toBe('POST');
    expect(route.path).toBe(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_CREATE);
    expect(route.options?.body?.maxBytes).toBe(100 * 1024 * 1024);
  });

  it('accepts a bounded array of valid create-monitor payloads', () => {
    expect(() =>
      bodySchema.parse({ monitors: [monitor, { ...monitor, url: 'https://elastic.co' }] })
    ).not.toThrow();
  });

  it('rejects unknown outer keys, empty batches, and invalid monitor payloads', () => {
    expect(bodySchema.safeParse({ monitors: [monitor], dry_run: true }).success).toBe(false);
    expect(bodySchema.safeParse({ monitors: [] }).success).toBe(false);
    expect(bodySchema.safeParse({ monitors: [{ locations: ['dev'] }] }).success).toBe(false);
  });

  it(`rejects more than ${MAX_MONITOR_FANOUT_SIZE} monitors`, () => {
    const monitors = Array.from({ length: MAX_MONITOR_FANOUT_SIZE + 1 }, (_, index) => ({
      ...monitor,
      url: `https://example.com/${index}`,
    }));
    expect(bodySchema.safeParse({ monitors }).success).toBe(false);
  });

  it('bulk-creates all prepared monitors and reports their IDs', async () => {
    const normalizedMonitors = [
      { locations: [{ id: 'dev', isServiceManaged: true }], spaces: ['default'] },
      { locations: [{ id: 'dev', isServiceManaged: true }], spaces: ['default'] },
    ];
    const { validateRequestedSpacesAccess, prepare, validateCreateAccess } =
      installPreprocessResult({
        normalizedMonitors,
        privateLocations: [],
        maintenanceWindows: [],
      });
    const sync = installSyncResult({
      newMonitors: [{ id: 'monitor-1' }, { id: 'monitor-2' }],
      failedMonitors: [],
      errors: [],
    });
    const context = mockRouteContext();
    context.request.body = { monitors: [monitor, { ...monitor, url: 'https://elastic.co' }] };

    const result = await route.handler(context);

    expect(validateRequestedSpacesAccess).toHaveBeenCalledWith(context.request.body.monitors);
    expect(prepare).toHaveBeenCalledWith(context.request.body.monitors);
    expect(validateCreateAccess).toHaveBeenCalledWith({
      normalizedMonitors,
      privateLocations: [],
      maintenanceWindows: [],
    });
    expect(sync).toHaveBeenCalledWith({
      routeContext: context,
      normalizedMonitors,
      privateLocations: [],
      maintenanceWindows: [],
      spaceId: 'default',
      hydrateNamespace: true,
    });
    expect(result).toEqual({
      result: [
        { id: 'monitor-1', created: true },
        { id: 'monitor-2', created: true },
      ],
    });
  });

  it('rejects unauthorized target spaces before preparing monitors', async () => {
    const { CreateMonitorBulkAPI } = jest.requireMock('../services/create_monitor_bulk_api');
    const validateRequestedSpacesAccess = jest
      .fn()
      .mockResolvedValue({ status: 403, body: { message: 'missing space access' } });
    const prepare = jest.fn();
    CreateMonitorBulkAPI.mockImplementation(() => ({ validateRequestedSpacesAccess, prepare }));
    const context = mockRouteContext();

    const result = await route.handler(context);

    expect(result).toEqual({ status: 403, body: { message: 'missing space access' } });
    expect(prepare).not.toHaveBeenCalled();
  });

  it('preserves input order when private-location synchronization fails', async () => {
    const normalizedMonitors = [
      { locations: [{ id: 'private-location', isServiceManaged: false }], spaces: ['default'] },
      { locations: [{ id: 'dev', isServiceManaged: true }], spaces: ['default'] },
    ];
    installPreprocessResult({ normalizedMonitors, privateLocations: [], maintenanceWindows: [] });
    installSyncResult({
      newMonitors: [{ id: 'monitor-1' }, { id: 'monitor-2' }],
      failedMonitors: [{ monitor: { id: 'monitor-1' }, error: new Error('sync failed') }],
      errors: [],
    });

    const result = await route.handler(mockRouteContext());

    expect(result).toEqual({
      result: [
        { id: 'monitor-1', created: false, error: 'sync failed' },
        { id: 'monitor-2', created: true },
      ],
    });
  });

  it('reports a private-location synchronization failure without an error object', async () => {
    const normalizedMonitors = [
      { locations: [{ id: 'private-location', isServiceManaged: false }], spaces: ['default'] },
    ];
    installPreprocessResult({ normalizedMonitors, privateLocations: [], maintenanceWindows: [] });
    installSyncResult({
      newMonitors: [{ id: 'monitor-1' }],
      failedMonitors: [{ monitor: { id: 'monitor-1' }, error: undefined }],
      errors: [],
    });

    const result = await route.handler(mockRouteContext());

    expect(result).toEqual({
      result: [
        { id: 'monitor-1', created: false, error: 'Failed to sync monitor to private location' },
      ],
    });
  });

  it('reports the message from a plain Saved Object synchronization error', async () => {
    const normalizedMonitors = [
      { locations: [{ id: 'private-location', isServiceManaged: false }], spaces: ['default'] },
    ];
    installPreprocessResult({ normalizedMonitors, privateLocations: [], maintenanceWindows: [] });
    installSyncResult({
      newMonitors: [{ id: 'monitor-1' }],
      failedMonitors: [
        {
          monitor: { id: 'monitor-1' },
          error: {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Policy write failed',
          },
        },
      ],
      errors: [],
    });

    const result = await route.handler(mockRouteContext());

    expect(result).toEqual({
      result: [{ id: 'monitor-1', created: false, error: 'Policy write failed' }],
    });
  });

  it('returns bulk-validation errors as a 400 response', async () => {
    const context = mockRouteContext();
    const { CreateMonitorBulkAPI } = jest.requireMock('../services/create_monitor_bulk_api');
    CreateMonitorBulkAPI.mockImplementation(() => ({
      validateRequestedSpacesAccess: jest.fn().mockResolvedValue(undefined),
      prepare: jest.fn().mockRejectedValue(
        new MonitorValidationError({
          valid: false,
          reason: 'bad monitor',
          details: 'details',
          payload: {},
        })
      ),
    }));

    const result = await route.handler(context);

    expect(result).toEqual({
      status: 400,
      body: { message: 'bad monitor', attributes: { details: 'details' } },
    });
  });
});
