/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Boom } from '@hapi/boom';
import {
  canManageSecurity,
  getDetectionEngineAccountId,
} from '../../../lib/service_accounts/detection_engine_account';
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
    request: { spaceId: 'space-a' },
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

  it('resumes a space that is not set up without asking for manage_security', async () => {
    jest.mocked(getDetectionEngineAccountId).mockResolvedValue(undefined);

    await expect(resumeRoute.handler(params)).resolves.toEqual({ state: 'enabled' });
    expect(canManageSecurity).not.toHaveBeenCalled();
  });
});
