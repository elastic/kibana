/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { internalMaintenanceRoutes } from './route';

vi.mock('../../utils/assert_significant_events_access', () => {
  const mocked = {
    assertSignificantEventsAccess: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

const route =
  internalMaintenanceRoutes['POST /internal/significant_events/maintenance/cleanup/_bootstrap'];
type HandlerParams = Parameters<typeof route.handler>[0];

describe('cleanup workflow bootstrap route', () => {
  beforeEach(() => vi.clearAllMocks());

  const createHandlerParams = (ensureEnabled = vi.fn().mockResolvedValue(undefined)) => {
    const request = {};
    const licensing = {};
    const server = {};
    const logger = { warn: vi.fn() };
    const maintenanceService = { getState: vi.fn().mockResolvedValue('enabled') };
    const getSpaceId = vi.fn().mockResolvedValue('space-a');

    return {
      request,
      licensing,
      server,
      logger,
      ensureEnabled,
      handlerParams: {
        request,
        server,
        logger,
        maintenanceService,
        getSpaceId,
        cleanupWorkflowService: { ensureEnabled },
        getScopedClients: vi.fn().mockResolvedValue({ licensing }),
      } as unknown as HandlerParams,
    };
  };

  it('requires Nightshift manage and enables cleanup in the current space', async () => {
    const params = createHandlerParams();

    await expect(route.handler(params.handlerParams)).resolves.toEqual({ success: true });

    expect(route.security.authz).toEqual({
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage, NIGHTSHIFT_API_PRIVILEGES.configure],
    });
    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({
      server: params.server,
      licensing: params.licensing,
    });
    expect(params.ensureEnabled).toHaveBeenCalledWith({
      request: params.request,
      spaceId: 'space-a',
    });
  });

  it('returns success when cleanup enablement fails', async () => {
    const params = createHandlerParams(
      vi.fn().mockRejectedValue(new Error('workflow unavailable'))
    );

    await expect(route.handler(params.handlerParams)).resolves.toEqual({ success: true });

    expect(params.logger.warn).toHaveBeenCalledWith(
      'Failed to ensure Significant Events cleanup workflow is enabled: workflow unavailable'
    );
  });
});

describe('pause, resume, and status routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps pause and status reachable while the feature flag is off, but not resume', async () => {
    const licensing = {};
    const server = { core: { security: { authc: { getCurrentUser: vi.fn() } } } };
    const handlerParams = {
      request: {},
      server,
      getScopedClients: vi.fn().mockResolvedValue({ licensing }),
      maintenanceService: {
        pause: vi.fn(),
        resume: vi.fn(),
        getStatus: vi.fn(),
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

    expect(vi.mocked(assertSignificantEventsAccess).mock.calls).toEqual([
      [{ server, licensing, ignore: ['feature_flag'] }],
      [{ server, licensing, ignore: ['feature_flag'] }],
      [{ server, licensing }],
    ]);
  });
});
