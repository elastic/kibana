/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, PluginInitializerContext } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { DetectionAccountService } from './detection_account';
import { DetectionSetupService } from './setup_service';

const request = httpServerMock.createKibanaRequest();
const WORKLOAD = { workloadType: 'detection_engine', workloadId: 'detection_engine' };

function createSetup({
  roleCount = 1,
  boundAccountId,
  accountSummary = { name: 'nightshift_detection', enabled: true },
  onSummaryRead,
}: {
  roleCount?: number;
  boundAccountId?: string;
  /** What core knows of the bound account. */
  accountSummary?: { name: string; enabled: boolean };
  /** Runs when the bound account is read, to act as a concurrent `_enable` call. */
  onSummaryRead?: () => void;
} = {}) {
  let currentAccountId = boundAccountId;
  const bindWorkload = jest.fn(async (_request: unknown, binding: { serviceAccountId: string }) => {
    currentAccountId = binding.serviceAccountId;
    return {};
  });
  const unbindWorkload = jest.fn(async () => {
    currentAccountId = undefined;
    return true;
  });
  const security = {
    serviceAccounts: {
      isEnabled: () => true,
      bindWorkload,
      unbindWorkload,
      getWorkloadBinding: jest.fn(async () =>
        currentAccountId ? { serviceAccountId: currentAccountId } : null
      ),
      getWorkloadServiceAccountSummary: jest.fn(async () => {
        onSummaryRead?.();
        return currentAccountId ? { id: currentAccountId, ...accountSummary } : null;
      }),
    },
  } as unknown as CoreStart['security'];
  const elasticsearch = {
    client: {
      asScoped: () => ({
        asCurrentUser: {
          security: {
            hasPrivileges: jest.fn(async () => ({ has_all_requested: true })),
            queryRole: jest.fn(async () => ({ total: roleCount })),
          },
        },
      }),
    },
  } as unknown as CoreStart['elasticsearch'];
  const spaces = {
    spacesService: { createSpacesClient: () => ({ get: jest.fn().mockResolvedValue({}) }) },
  } as unknown as SpacesPluginStart;
  const env = { packageInfo: { buildFlavor: 'serverless' } } as PluginInitializerContext['env'];
  const logger: Logger = loggingSystemMock.createLogger();

  return {
    service: new DetectionSetupService(
      new DetectionAccountService(security, elasticsearch),
      security,
      elasticsearch,
      spaces,
      logger,
      env
    ),
    bindWorkload,
    unbindWorkload,
    rebind: (serviceAccountId: string) => {
      currentAccountId = serviceAccountId;
    },
  };
}

describe('DetectionSetupService.enable', () => {
  it('refuses another account and puts the previous binding back', async () => {
    const { service, bindWorkload } = createSetup({
      boundAccountId: 'detection-account',
      accountSummary: { name: 'nightshift_agent', enabled: true },
    });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'agent-account' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('nightshift_agent'),
    });
    expect(bindWorkload).toHaveBeenLastCalledWith(request, {
      serviceAccountId: 'detection-account',
      ...WORKLOAD,
    });
  });

  it('unbinds the space again when no account was bound before', async () => {
    const { service, unbindWorkload } = createSetup({
      accountSummary: { name: 'nightshift_agent', enabled: true },
    });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'agent-account' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(unbindWorkload).toHaveBeenCalledWith(request, WORKLOAD);
  });

  it('fails with 409 when a concurrent call bound the space to another account', async () => {
    const setup = createSetup({ onSummaryRead: () => setup.rebind('account-2') });

    await expect(
      setup.service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 409 });
    // The newer binding belongs to the concurrent call: the failed one leaves it alone.
    expect(setup.unbindWorkload).not.toHaveBeenCalled();
  });

  it('refuses with 400 when the role of the account does not exist, binding nothing', async () => {
    const { service, bindWorkload } = createSetup({ roleCount: 0 });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('[_nightshift_detection]'),
    });
    expect(bindWorkload).not.toHaveBeenCalled();
  });
});
