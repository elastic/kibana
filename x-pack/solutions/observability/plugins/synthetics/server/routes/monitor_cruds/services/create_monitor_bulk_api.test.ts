/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../../common/runtime_types';
import type { RouteContext } from '../../types';
import { CreateMonitorBulkAPI } from './create_monitor_bulk_api';
import type { BulkCreatePreprocessResult } from './create_monitor_bulk_api';

jest.mock('../edit_monitor', () => ({
  validatePermissions: jest.fn(),
}));

jest.mock('../monitor_locations_utils', () => ({
  assertCanPerformMonitorBulkActionInAllSpaces: jest.fn(),
  validateMonitorPrivateLocationSpaces: jest.fn(),
}));

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocationsForNamespaces: jest.fn(),
}));

const mockResponse = () => ({
  badRequest: jest.fn((options: any) => ({ status: 400, ...options })),
  forbidden: jest.fn((options: any) => ({ status: 403, ...options })),
});

const preparedMonitors = {
  normalizedMonitors: [
    {
      [ConfigKey.LOCATIONS]: [{ id: 'public-location', isServiceManaged: true }],
      [ConfigKey.KIBANA_SPACES]: ['default', 'marketing'],
    },
  ],
  privateLocations: [],
} as unknown as BulkCreatePreprocessResult;

const mockRouteContext = (response = mockResponse()) =>
  ({ response, spaceId: 'default' } as unknown as RouteContext);

describe('CreateMonitorBulkAPI.validateCreateAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock('../edit_monitor').validatePermissions.mockResolvedValue(undefined);
    jest
      .requireMock('../monitor_locations_utils')
      .assertCanPerformMonitorBulkActionInAllSpaces.mockResolvedValue(undefined);
    jest
      .requireMock('../monitor_locations_utils')
      .validateMonitorPrivateLocationSpaces.mockReturnValue(null);
  });

  it('validates public-location capability and private-location coverage after space access preflight', async () => {
    const routeContext = mockRouteContext();
    const createMonitorBulkAPI = new CreateMonitorBulkAPI(routeContext);

    await expect(
      createMonitorBulkAPI.validateCreateAccess(preparedMonitors)
    ).resolves.toBeUndefined();

    expect(jest.requireMock('../edit_monitor').validatePermissions).toHaveBeenCalledWith(
      routeContext,
      preparedMonitors.normalizedMonitors[0][ConfigKey.LOCATIONS]
    );
    expect(
      jest.requireMock('../monitor_locations_utils').assertCanPerformMonitorBulkActionInAllSpaces
    ).not.toHaveBeenCalled();
    expect(
      jest.requireMock('../monitor_locations_utils').validateMonitorPrivateLocationSpaces
    ).toHaveBeenCalledWith(preparedMonitors.normalizedMonitors[0], expect.any(Map));
  });

  it('returns a forbidden response when public locations are disabled', async () => {
    const response = mockResponse();
    const routeContext = mockRouteContext(response);
    jest
      .requireMock('../edit_monitor')
      .validatePermissions.mockResolvedValue('Public locations are disabled');

    const result = await new CreateMonitorBulkAPI(routeContext).validateCreateAccess(
      preparedMonitors
    );

    expect(result).toEqual({ status: 403, body: { message: 'Public locations are disabled' } });
    expect(response.forbidden).toHaveBeenCalledWith({
      body: { message: 'Public locations are disabled' },
    });
    expect(
      jest.requireMock('../monitor_locations_utils').assertCanPerformMonitorBulkActionInAllSpaces
    ).not.toHaveBeenCalled();
  });
});

describe('CreateMonitorBulkAPI.validateRequestedSpacesAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../monitor_locations_utils')
      .assertCanPerformMonitorBulkActionInAllSpaces.mockResolvedValue(undefined);
  });

  it('checks every distinct target space before monitor preparation', async () => {
    const routeContext = mockRouteContext();

    await expect(
      new CreateMonitorBulkAPI(routeContext).validateRequestedSpacesAccess([
        { [ConfigKey.KIBANA_SPACES]: ['default', 'marketing'] },
        { [ConfigKey.KIBANA_SPACES]: ['marketing', 'sre'] },
      ] as any)
    ).resolves.toBeUndefined();

    expect(
      jest.requireMock('../monitor_locations_utils').assertCanPerformMonitorBulkActionInAllSpaces
    ).toHaveBeenCalledWith(routeContext, ['default', 'marketing', 'sre'], undefined, 'bulk_create');
  });
});

describe('CreateMonitorBulkAPI.prepare helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects monitor names that differ only by case', () => {
    const api = new CreateMonitorBulkAPI(mockRouteContext());

    expect(() =>
      (api as any).validateUniqueNames([
        { [ConfigKey.NAME]: 'Checkout' },
        { [ConfigKey.NAME]: 'checkout' },
      ])
    ).toThrow('Monitor name must be unique, "checkout" already exists.');
  });

  it('resolves private locations for each monitor only in its own target spaces', async () => {
    const internalRepository = {};
    const routeContext = {
      ...mockRouteContext(),
      server: {
        coreStart: {
          savedObjects: { createInternalRepository: jest.fn(() => internalRepository) },
        },
      },
    } as unknown as RouteContext;
    const api = new CreateMonitorBulkAPI(routeContext);
    const getPrivateLocationsForNamespaces = jest.requireMock(
      '../../../synthetics_service/get_private_locations'
    ).getPrivateLocationsForNamespaces;
    getPrivateLocationsForNamespaces.mockResolvedValue([]);

    await (api as any).getPrivateLocationsForMonitors([
      { private_locations: ['marketing-location'], [ConfigKey.KIBANA_SPACES]: ['marketing'] },
      { private_locations: ['sre-location'], [ConfigKey.KIBANA_SPACES]: ['sre'] },
    ]);

    expect(getPrivateLocationsForNamespaces).toHaveBeenNthCalledWith(1, internalRepository, [
      'default',
      'marketing',
    ]);
    expect(getPrivateLocationsForNamespaces).toHaveBeenNthCalledWith(2, internalRepository, [
      'default',
      'sre',
    ]);
  });

  it('skips private-location repository work for batches without private locations', async () => {
    const createInternalRepository = jest.fn();
    const routeContext = {
      ...mockRouteContext(),
      server: { coreStart: { savedObjects: { createInternalRepository } } },
    } as unknown as RouteContext;
    const api = new CreateMonitorBulkAPI(routeContext);

    await expect(
      (api as any).getPrivateLocationsForMonitors([
        { [ConfigKey.LOCATIONS]: [{ id: 'public-location', isServiceManaged: true }] },
      ])
    ).resolves.toEqual([[]]);

    expect(createInternalRepository).not.toHaveBeenCalled();
  });
});
