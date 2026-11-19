/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, PluginInitializerContext } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import Boom from '@hapi/boom';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { EngineHttpError } from '../errors/engine_http_error';
import { DetectionAccountService } from './detection_account';
import { DetectionSetupService } from './setup_service';

const request = httpServerMock.createKibanaRequest();
const WORKLOAD = { workloadType: 'detection_engine', workloadId: 'detection_engine' };

function createSetup({
  roleCount = 1,
  boundAccountId,
  accountSummary = { name: 'nightshift_detection', enabled: true, assumable: true },
  summaryError,
  canManageSecurity = true,
  spaceExists = true,
  onSummaryRead,
  installWorkflow = async () => {},
}: {
  roleCount?: number;
  boundAccountId?: string;
  /** What core knows of the bound account. */
  accountSummary?: { name: string; enabled: boolean; assumable: boolean };
  /** Makes core fail to read the account, as UIAM does when it refuses Kibana's identity. */
  summaryError?: Error;
  canManageSecurity?: boolean;
  spaceExists?: boolean;
  /** Runs when the bound account is read, to act as a concurrent `_enable` call. */
  onSummaryRead?: () => void;
  /** Stands in for installing the bound workflow. */
  installWorkflow?: () => Promise<void>;
} = {}) {
  let currentAccountId = boundAccountId;
  const enableWorkflow = jest.fn(async () => {});
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
        if (summaryError) {
          throw summaryError;
        }
        return currentAccountId ? { id: currentAccountId, ...accountSummary } : null;
      }),
    },
  } as unknown as CoreStart['security'];
  const elasticsearch = {
    client: {
      asScoped: () => ({
        asCurrentUser: {
          security: {
            hasPrivileges: jest.fn(async () => ({ has_all_requested: canManageSecurity })),
            queryRole: jest.fn(async () => ({ total: roleCount })),
          },
        },
      }),
    },
  } as unknown as CoreStart['elasticsearch'];
  const spaces = {
    spacesService: {
      createSpacesClient: () => ({
        get: spaceExists
          ? jest.fn().mockResolvedValue({})
          : jest.fn().mockRejectedValue(Boom.notFound('no such space')),
      }),
    },
  } as unknown as SpacesPluginStart;
  const env = { packageInfo: { buildFlavor: 'serverless' } } as PluginInitializerContext['env'];
  const logger: Logger = loggingSystemMock.createLogger();

  return {
    service: new DetectionSetupService(
      new DetectionAccountService(security, elasticsearch),
      { install: installWorkflow, enable: enableWorkflow },
      security,
      elasticsearch,
      spaces,
      logger,
      env
    ),
    bindWorkload,
    unbindWorkload,
    enableWorkflow,
    rebind: (serviceAccountId: string) => {
      currentAccountId = serviceAccountId;
    },
  };
}

describe('DetectionSetupService.enable', () => {
  it('binds the space to the account, and binds it again with the same id without undoing it', async () => {
    const { service, unbindWorkload, enableWorkflow } = createSetup();

    const first = await service.enable({
      request,
      spaceId: 'default',
      serviceAccountId: 'account-1',
    });
    const second = await service.enable({
      request,
      spaceId: 'default',
      serviceAccountId: 'account-1',
    });

    expect(first).toEqual({ spaceId: 'default', serviceAccountId: 'account-1' });
    expect(second).toEqual(first);
    expect(unbindWorkload).not.toHaveBeenCalled();
    // The workflow is installed off and switched on by the last step of each successful call.
    expect(enableWorkflow).toHaveBeenCalledTimes(2);
  });

  it('refuses with 403 a user without manage_security, binding nothing', async () => {
    const { service, bindWorkload } = createSetup({ canManageSecurity: false });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });

  it('refuses with 404 a space that does not exist, binding nothing', async () => {
    const { service, bindWorkload } = createSetup({ spaceExists: false });

    await expect(
      service.enable({ request, spaceId: 'missing', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });

  it('keeps the binding when UIAM refuses to let Kibana read the account, as the local UIAM does', async () => {
    const { service, unbindWorkload } = createSetup({
      summaryError: Boom.forbidden('not for this project'),
    });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).resolves.toEqual({ spaceId: 'default', serviceAccountId: 'account-1' });
    expect(unbindWorkload).not.toHaveBeenCalled();
  });

  it('refuses an account Kibana holds no credential for, and unbinds the space again', async () => {
    const { service, unbindWorkload } = createSetup({
      accountSummary: { name: 'nightshift_detection', enabled: true, assumable: false },
    });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('no credential'),
    });
    expect(unbindWorkload).toHaveBeenCalledWith(request, WORKLOAD);
  });

  it('refuses another account and puts the previous binding back', async () => {
    const { service, bindWorkload } = createSetup({
      boundAccountId: 'detection-account',
      accountSummary: { name: 'nightshift_agent', enabled: true, assumable: true },
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
      accountSummary: { name: 'nightshift_agent', enabled: true, assumable: true },
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
    // The newer binding belongs to the concurrent call: the failed one leaves it alone, and it
    // must not switch on the workflow the winning call is still setting up.
    expect(setup.unbindWorkload).not.toHaveBeenCalled();
    expect(setup.enableWorkflow).not.toHaveBeenCalled();
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

  it('puts a space that was never set up back, workflow off, when the workflow install fails', async () => {
    const { service, unbindWorkload, enableWorkflow } = createSetup({
      installWorkflow: async () => {
        throw new EngineHttpError('install failed', 500);
      },
    });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(unbindWorkload).toHaveBeenCalledTimes(1);
    expect(enableWorkflow).not.toHaveBeenCalled();
  });

  it('keeps the new account of a rebound space when the workflow install fails', async () => {
    const { service, bindWorkload, unbindWorkload } = createSetup({
      boundAccountId: 'account-0',
      installWorkflow: async () => {
        throw new EngineHttpError('install failed', 500);
      },
    });

    await expect(
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 500 });
    // Only the bind of the new account: the workflow may already run as it, so going back would
    // split the engine and its workflow across two accounts.
    expect(bindWorkload).toHaveBeenCalledTimes(1);
    expect(unbindWorkload).not.toHaveBeenCalled();
  });
});

describe('DetectionSetupService.getStatus', () => {
  it('reports the account the space runs as, the role it needs and whether the user may set it up', async () => {
    const { service } = createSetup({ boundAccountId: 'account-1' });

    await expect(service.getStatus({ request, spaceId: 'default' })).resolves.toEqual({
      serviceAccountsEnabled: true,
      canSetUp: true,
      role: '_nightshift_detection',
      serviceAccountId: 'account-1',
    });
  });
});
