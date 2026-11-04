/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { StatusError } from '../../../lib/errors/status_error';
import { assertCanChangeBoundWorkflows } from '../../../lib/service_accounts/detection_engine_account';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { internalMaintenanceRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/service_accounts/detection_engine_account', () => ({
  assertCanChangeBoundWorkflows: jest.fn().mockResolvedValue(undefined),
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
      getSpaceId: jest.fn().mockResolvedValue('default'),
    } as unknown as Parameters<typeof resetRoute.handler>[0]);

    expect(resetRoute.security.authz).toEqual({
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    });
    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
    expect(reset).toHaveBeenCalledWith({ request, updatedBy: 'operator' });
  });

  it('refuses before touching the space when the caller cannot change the bound workflows', async () => {
    jest
      .mocked(assertCanChangeBoundWorkflows)
      .mockRejectedValueOnce(new StatusError('requires manage_security', 403));
    const reset = jest.fn();

    await expect(
      resetRoute.handler({
        request: {},
        server: { core: { security: { authc: { getCurrentUser: jest.fn() } } } },
        maintenanceService: { reset },
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
        getSpaceId: jest.fn().mockResolvedValue('space-a'),
      } as unknown as Parameters<typeof resetRoute.handler>[0])
    ).rejects.toMatchObject({ output: { statusCode: 403 } });

    expect(reset).not.toHaveBeenCalled();
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
      getSpaceId: jest.fn().mockResolvedValue('default'),
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

  it.each([
    ['pause', 'POST /internal/significant_events/maintenance/_pause'],
    ['resume', 'POST /internal/significant_events/maintenance/_resume'],
  ] as const)(
    'refuses %s before touching the space when the caller cannot change the bound workflows',
    async (action, endpoint) => {
      jest
        .mocked(assertCanChangeBoundWorkflows)
        .mockRejectedValueOnce(new StatusError('requires manage_security', 403));
      const maintenanceService = { pause: jest.fn(), resume: jest.fn() };
      const handlerParams = {
        request: {},
        server: { core: { security: { authc: { getCurrentUser: jest.fn() } } } },
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
        getSpaceId: jest.fn().mockResolvedValue('space-a'),
        maintenanceService,
      };
      const { handler } = internalMaintenanceRoutes[endpoint];

      await expect(
        handler(handlerParams as unknown as Parameters<typeof handler>[0])
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(maintenanceService[action]).not.toHaveBeenCalled();
      expect(assertCanChangeBoundWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'space-a' })
      );
    }
  );
});
