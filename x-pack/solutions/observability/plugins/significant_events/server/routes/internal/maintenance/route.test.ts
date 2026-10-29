/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { internalMaintenanceRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

describe('reset route', () => {
  const resetRoute =
    internalMaintenanceRoutes['POST /internal/significant_events/maintenance/_reset'];

  beforeEach(() => jest.clearAllMocks());

  it('requires Nightshift manage and configure and delegates with the authenticated user', async () => {
    const request = {};
    const licensing = {};
    const reset = jest.fn().mockResolvedValue({ state: 'enabled' });
    const server = {
      core: {
        security: {
          authc: { getCurrentUser: jest.fn().mockReturnValue({ username: 'operator' }) },
        },
      },
    };

    await resetRoute.handler({
      request,
      server,
      maintenanceService: { reset },
      getScopedClients: jest.fn().mockResolvedValue({ licensing }),
    } as unknown as Parameters<typeof resetRoute.handler>[0]);

    expect(resetRoute.security.authz).toEqual({
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    });
    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
    expect(reset).toHaveBeenCalledWith({ request, updatedBy: 'operator' });
  });
});

describe('pause, resume, and status routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps pause and status reachable while the feature flag is off, but not resume', async () => {
    const licensing = {};
    const server = { core: { security: { authc: { getCurrentUser: jest.fn() } } } };
    const handlerParams = {
      request: {},
      server,
      getScopedClients: jest.fn().mockResolvedValue({ licensing }),
      maintenanceService: {
        pause: jest.fn(),
        resume: jest.fn(),
        getStatus: jest.fn(),
      },
    };
    const accessChecks = [
      'POST /internal/significant_events/maintenance/_pause',
      'GET /internal/significant_events/maintenance/_status',
      'POST /internal/significant_events/maintenance/_resume',
    ] as const;

    for (const endpoint of accessChecks) {
      const { handler } = internalMaintenanceRoutes[endpoint];
      await handler(handlerParams as unknown as Parameters<typeof handler>[0]);
    }

    expect(jest.mocked(assertSignificantEventsAccess).mock.calls).toEqual([
      [{ server, licensing, ignore: ['feature_flag'] }],
      [{ server, licensing, ignore: ['feature_flag'] }],
      [{ server, licensing }],
    ]);
  });
});
