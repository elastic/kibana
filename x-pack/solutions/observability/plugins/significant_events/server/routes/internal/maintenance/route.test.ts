/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Boom } from '@hapi/boom';
import { OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED } from '@kbn/management-settings-ids';
import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  canManageSecurity,
  getDetectionEngineAccountId,
} from '../../../lib/service_accounts/detection_engine_account';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { internalMaintenanceRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../lib/service_accounts/detection_engine_account');

const resumeRoute =
  internalMaintenanceRoutes['POST /internal/significant_events/maintenance/_resume'];
type HandlerParams = Parameters<typeof resumeRoute.handler>[0];

describe('resume route', () => {
  const resume = jest.fn().mockResolvedValue({ state: 'enabled' });
  const params = {
    request: { spaceId: 'default' },
    server: { core: { security: { authc: { getCurrentUser: () => ({ username: 'marco' }) } } } },
    getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
    maintenanceService: { resume },
  } as unknown as HandlerParams;

  beforeEach(() => jest.clearAllMocks());

  it('refuses a caller without manage_security in a space that runs as the service account', async () => {
    jest.mocked(getDetectionEngineAccountId).mockResolvedValue('account-1');
    jest.mocked(canManageSecurity).mockResolvedValue(false);

    const error = await resumeRoute.handler(params).catch((caught: unknown) => caught);

    // The route wrapper turns a StatusError into a Boom error.
    expect((error as Boom).output.statusCode).toBe(403);
    expect(resume).not.toHaveBeenCalled();
  });

  it('installs the settings-backed workflows of a set-up space after resuming it', async () => {
    jest.mocked(getDetectionEngineAccountId).mockResolvedValue('account-1');
    jest.mocked(canManageSecurity).mockResolvedValue(true);
    const uiSettingsClient = {
      getAll: jest.fn().mockResolvedValue({
        [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED]: true,
      }),
    };
    const continuousOnboardingWorkflowService = {
      ensureWorkflow: jest.fn().mockResolvedValue(undefined),
    };
    resume.mockResolvedValueOnce({ state: 'enabled', partialFailures: [] });

    await resumeRoute.handler({
      ...params,
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {}, uiSettingsClient }),
      continuousOnboardingWorkflowService,
    } as unknown as HandlerParams);

    expect(continuousOnboardingWorkflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request: params.request,
      spaceId: 'default',
    });
  });

  it('resumes a space that is not set up without asking for manage_security', async () => {
    jest.mocked(getDetectionEngineAccountId).mockResolvedValue(undefined);

    await expect(resumeRoute.handler(params)).resolves.toEqual({ state: 'enabled' });
    expect(canManageSecurity).not.toHaveBeenCalled();
  });
});

describe('reset route', () => {
  const resetRoute =
    internalMaintenanceRoutes['POST /internal/significant_events/maintenance/_reset'];

  beforeEach(() => jest.clearAllMocks());

  it('refuses a caller without manage_security in a space that runs as the service account', async () => {
    jest.mocked(getDetectionEngineAccountId).mockResolvedValue('account-1');
    jest.mocked(canManageSecurity).mockResolvedValue(false);
    const reset = jest.fn();

    const error = await resetRoute
      .handler({
        request: { spaceId: 'default' },
        server: { core: {} },
        maintenanceService: { reset },
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
      } as unknown as Parameters<typeof resetRoute.handler>[0])
      .catch((caught: unknown) => caught);

    expect((error as Boom).output.statusCode).toBe(403);
    expect(reset).not.toHaveBeenCalled();
  });

  it('requires Nightshift manage and configure and delegates with the authenticated user', async () => {
    jest.mocked(getDetectionEngineAccountId).mockResolvedValue(undefined);
    const request = { spaceId: 'default' };
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
      request: { spaceId: 'default' },
      server,
      getScopedClients: jest.fn().mockResolvedValue({ licensing }),
      maintenanceService: {
        pause: jest.fn(),
        resume: jest.fn().mockResolvedValue({ state: 'paused' }),
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
