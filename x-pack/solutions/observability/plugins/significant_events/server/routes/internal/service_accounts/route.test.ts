/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Boom } from '@hapi/boom';
import { reconcileSettingsBackedWorkflows } from '../../../lib/workflows/reconcile_settings_backed_workflows';
import { createDetectionEngineSetupService } from '../../../lib/service_accounts/service_account_setup';
import { internalServiceAccountRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../lib/service_accounts/service_account_setup');
jest.mock('../../../lib/workflows/reconcile_settings_backed_workflows');

const enableRoute =
  internalServiceAccountRoutes['POST /internal/significant_events/service_account/_enable'];
type HandlerParams = Parameters<typeof enableRoute.handler>[0];

describe('_enable route', () => {
  const enable = jest.fn().mockResolvedValue({ spaceId: 'space-a', serviceAccountId: 'account-1' });
  const setup = (state: 'enabled' | 'paused') =>
    ({
      params: { body: { serviceAccountId: 'account-1' } },
      request: { spaceId: 'space-a' },
      server: {},
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {}, uiSettingsClient: {} }),
      getSpaceId: jest.fn().mockResolvedValue('space-a'),
      maintenanceService: { getState: jest.fn().mockResolvedValue(state) },
    } as unknown as HandlerParams);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createDetectionEngineSetupService).mockReturnValue({ enable } as never);
    jest.mocked(reconcileSettingsBackedWorkflows).mockResolvedValue(undefined);
  });

  it('installs the settings-backed workflows after binding an enabled space', async () => {
    await enableRoute.handler(setup('enabled'));

    expect(reconcileSettingsBackedWorkflows).toHaveBeenCalledTimes(1);
  });

  it('leaves them to Resume while the space is paused', async () => {
    await expect(enableRoute.handler(setup('paused'))).resolves.toEqual({
      spaceId: 'space-a',
      serviceAccountId: 'account-1',
    });

    expect(reconcileSettingsBackedWorkflows).not.toHaveBeenCalled();
  });

  it('answers 500 with a retry hint when installing them fails after binding', async () => {
    jest.mocked(reconcileSettingsBackedWorkflows).mockRejectedValueOnce(new Error('boom'));

    const error = await enableRoute.handler(setup('enabled')).catch((caught: unknown) => caught);

    expect((error as Boom).output.statusCode).toBe(500);
    expect((error as Boom).message).toContain('Call _enable again to retry');
  });
});
