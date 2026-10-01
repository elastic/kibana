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

  it('validates public-location capability, shared-space privileges, and private-location coverage', async () => {
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
    ).toHaveBeenCalledWith(routeContext, ['default', 'marketing'], undefined, 'bulk_create');
    expect(
      jest.requireMock('../monitor_locations_utils').validateMonitorPrivateLocationSpaces
    ).toHaveBeenCalledWith(preparedMonitors.normalizedMonitors[0], expect.any(Map));
  });

  it('returns a forbidden response before checking shared spaces when public locations are disabled', async () => {
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
