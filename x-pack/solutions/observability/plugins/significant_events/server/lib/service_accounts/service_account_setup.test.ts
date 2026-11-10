/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreStart, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createDetectionEngineSetupService, SETUP_WORKFLOW_IDS } from './service_account_setup';

const request = httpServerMock.createKibanaRequest();

const createWorkflowsExtensions = ({ bindInstalls = true }: { bindInstalls?: boolean } = {}) => {
  const boundTo = new Map<string, string>();
  const install = jest.fn(async (...args: unknown[]) => {
    const [, workflowId, options] = args as [
      unknown,
      string,
      { workflowIdSuffix: string; values: { serviceAccountId: string } }
    ];
    if (bindInstalls) {
      boundTo.set(`${workflowId}-${options.workflowIdSuffix}`, options.values.serviceAccountId);
    }
  });
  const workflowsExtensions = {
    getClient: async () => ({ managedWorkflows: { install } }),
  } as unknown as WorkflowsExtensionsServerPluginStart;
  const getWorkflow = async (id: string) =>
    boundTo.has(id) ? { definition: { settings: { run_as: boundTo.get(id) } } } : null;
  const workflowsManagement = {
    management: {
      getWorkflow,
      getClient: () => ({ getWorkflow }),
      updateWorkflow: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as WorkflowsServerPluginSetup;
  return { workflowsExtensions, workflowsManagement, install };
};

const createCore = ({
  enabled = true,
  canManageSecurity = true,
  roleCount = 1,
  boundAccountId,
  privilegeProbeFails = false,
  accountSummary = { name: 'nightshift_detection', enabled: true },
  accountReadStatus,
}: {
  enabled?: boolean;
  canManageSecurity?: boolean;
  roleCount?: number;
  boundAccountId?: string;
  privilegeProbeFails?: boolean;
  /** What core knows of the bound account, or `null` when it does not exist. */
  accountSummary?: { name: string; enabled: boolean } | null;
  /** Makes reading the account fail with this status, as UIAM does when Kibana may not read it. */
  accountReadStatus?: number;
} = {}) => {
  const hasPrivileges = jest.fn(async () => {
    if (privilegeProbeFails) {
      throw new Error('boom');
    }
    return { has_all_requested: canManageSecurity };
  });
  let currentAccountId = boundAccountId;
  const bindWorkload = jest.fn(async (_request: unknown, binding: { serviceAccountId: string }) => {
    currentAccountId = binding.serviceAccountId;
    return {};
  });
  const unbindWorkload = jest.fn(async () => {
    currentAccountId = undefined;
    return true;
  });
  const queryRole = jest.fn(async () => ({ total: roleCount }));
  const core = {
    security: {
      serviceAccounts: {
        isEnabled: () => enabled,
        bindWorkload,
        unbindWorkload,
        getWorkloadBinding: jest.fn(async () =>
          currentAccountId ? { serviceAccountId: currentAccountId } : null
        ),
        getWorkloadServiceAccountSummary: jest.fn(async () => {
          if (accountReadStatus) {
            throw Object.assign(new Error('Forbidden'), { statusCode: accountReadStatus });
          }
          return accountSummary && currentAccountId
            ? { id: currentAccountId, ...accountSummary }
            : null;
        }),
      },
    },
    elasticsearch: {
      client: {
        asScoped: () => ({
          asCurrentUser: {
            security: {
              hasPrivileges,
              queryRole,
            },
          },
        }),
      },
    },
  } as unknown as CoreStart;
  const rebind = (serviceAccountId: string) => {
    currentAccountId = serviceAccountId;
  };
  return { core, bindWorkload, unbindWorkload, queryRole, hasPrivileges, rebind };
};

describe('createDetectionEngineSetupService.enable', () => {
  it('binds the given account to the space, after checking the Serverless role exists', async () => {
    const { core, bindWorkload, queryRole } = createCore();

    const result = await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      ...createWorkflowsExtensions(),
      isServerless: true,
    }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' });

    expect(result).toMatchObject({ spaceId: 'default', serviceAccountId: 'account-1' });
    expect(queryRole).toHaveBeenCalledWith({
      query: { term: { name: '_nightshift_detection' } },
      size: 1,
    });
    expect(bindWorkload).toHaveBeenCalledWith(request, {
      serviceAccountId: 'account-1',
      workloadType: 'detection_engine',
      workloadId: 'detection_engine',
    });
  });

  it('refuses an account that does not exist and leaves the space not set up', async () => {
    const { core, unbindWorkload } = createCore({ accountSummary: null });
    const { install, ...workflows } = createWorkflowsExtensions();

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...workflows,
        isServerless: true,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'does-not-exist' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('does not exist'),
    });
    expect(unbindWorkload).toHaveBeenCalledWith(request, {
      workloadType: 'detection_engine',
      workloadId: 'detection_engine',
    });
    expect(install).not.toHaveBeenCalled();
  });

  it('keeps the binding and warns when the account cannot be read', async () => {
    const { core, unbindWorkload } = createCore({ accountReadStatus: 403 });
    const logger = { warn: jest.fn() } as unknown as Logger;

    const result = await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      ...createWorkflowsExtensions(),
      isServerless: true,
      logger,
    }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' });

    expect(result).toMatchObject({ serviceAccountId: 'account-1' });
    expect(unbindWorkload).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not verify'));
  });

  it('fails and unbinds the unchecked account when reading it fails for another reason', async () => {
    const { core } = createCore({ accountReadStatus: 500 });

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: true,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 500 });
    await expect(
      core.security.serviceAccounts.getWorkloadBinding({
        workloadType: 'detection_engine',
        workloadId: 'detection_engine',
        spaceId: 'default',
      })
    ).resolves.toBeNull();
  });

  it('still refuses another account when putting the previous binding back fails', async () => {
    const { core, unbindWorkload } = createCore({
      accountSummary: { name: 'nightshift_agent', enabled: true },
    });
    unbindWorkload.mockRejectedValueOnce(new Error('UIAM unavailable'));
    const logger = { warn: jest.fn(), error: jest.fn() } as unknown as Logger;

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: true,
        logger,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'agent-account' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('nightshift_agent'),
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('UIAM unavailable'));
  });

  it('refuses another account and puts the previous binding back', async () => {
    const { core, bindWorkload } = createCore({
      boundAccountId: 'detection-account',
      accountSummary: { name: 'nightshift_agent', enabled: true },
    });

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: true,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'agent-account' })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('nightshift_agent'),
    });
    expect(bindWorkload).toHaveBeenLastCalledWith(request, {
      serviceAccountId: 'detection-account',
      workloadType: 'detection_engine',
      workloadId: 'detection_engine',
    });
  });

  it('refuses with 403 without manage_security, binding nothing', async () => {
    const { core, bindWorkload } = createCore({ canManageSecurity: false });

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: false,
      }).enable({
        request,
        spaceId: 'default',
        serviceAccountId: 'account-1',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });

  it('refuses with 400 when the role of the account does not exist, binding nothing', async () => {
    const { core, bindWorkload } = createCore({ roleCount: 0 });

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: false,
      }).enable({
        request,
        spaceId: 'default',
        serviceAccountId: 'account-1',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('[nightshift_detection]'),
    });
    expect(bindWorkload).not.toHaveBeenCalled();
  });

  it('refuses with 400 when service accounts are off', async () => {
    const { core, bindWorkload } = createCore({ enabled: false });

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: false,
      }).enable({
        request,
        spaceId: 'default',
        serviceAccountId: 'account-1',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });
});

describe('createDetectionEngineSetupService.getStatus', () => {
  it('reports a space that is not set up with a null account, and a user who can set it up', async () => {
    const { core } = createCore();

    expect(
      await createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: true,
      }).getStatus({ request, spaceId: 'default' })
    ).toEqual({
      serviceAccountsEnabled: true,
      canSetUp: true,
      role: '_nightshift_detection',
      serviceAccountId: null,
    });
  });

  it('reports the bound account', async () => {
    const { core } = createCore({ boundAccountId: 'account-1' });

    expect(
      (
        await createDetectionEngineSetupService({
          core,
          spaces: undefined,
          ...createWorkflowsExtensions(),
          isServerless: false,
        }).getStatus({ request, spaceId: 'default' })
      ).serviceAccountId
    ).toBe('account-1');
  });

  it('does not probe privileges when service accounts are off', async () => {
    const { core, hasPrivileges } = createCore({ enabled: false });

    const status = await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      ...createWorkflowsExtensions(),
      isServerless: false,
    }).getStatus({ request, spaceId: 'default' });

    expect(status).toMatchObject({ serviceAccountsEnabled: false, canSetUp: false });
    expect(hasPrivileges).not.toHaveBeenCalled();
  });

  it('answers when the privilege probe fails, reading it as cannot set up', async () => {
    const { core } = createCore({ privilegeProbeFails: true });

    expect(
      await createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions(),
        isServerless: false,
      }).getStatus({ request, spaceId: 'default' })
    ).toMatchObject({ canSetUp: false });
  });
});

describe('createDetectionEngineSetupService.enable workflows', () => {
  it('installs every setup workflow in the space, bound to the account', async () => {
    const { core } = createCore();
    const { install, ...workflows } = createWorkflowsExtensions();

    await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      ...workflows,
      isServerless: false,
    }).enable({ request, spaceId: 'marketing', serviceAccountId: 'account-1' });

    const expectedIds = [
      'system-sources-ki-onboarding-bound',
      'system-nightshift-orchestrator-bound',
      'system-sources-ki-sync-bound',
      'system-nightshift-cleanup-bound',
      'system-nightshift-source-reconciliation-bound',
      'system-nightshift-investigation-completed-bound',
    ];
    expect(install.mock.calls.map(([, workflowId]) => workflowId)).toEqual(expectedIds);
    expect(install).toHaveBeenCalledWith('significantEvents', SETUP_WORKFLOW_IDS[0], {
      spaceId: 'marketing',
      workflowIdSuffix: 'marketing',
      values: { serviceAccountId: 'account-1' },
    });
  });

  it('installs nothing when the account cannot be bound', async () => {
    const { core, bindWorkload } = createCore();
    bindWorkload.mockRejectedValueOnce(new Error('bind failed'));
    const { install, ...workflows } = createWorkflowsExtensions();

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...workflows,
        isServerless: false,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toThrow('bind failed');
    expect(install).not.toHaveBeenCalled();
  });

  it('names the workflow that failed to install and says the space is bound', async () => {
    const { core } = createCore();
    const { install, ...workflows } = createWorkflowsExtensions();
    install.mockRejectedValueOnce(new Error('index not ready'));

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...workflows,
        isServerless: false,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('[system-sources-ki-onboarding-bound]'),
    });
  });

  it('keeps the status of an install error and only suggests a retry for server errors', async () => {
    const { core } = createCore();
    const { install, ...workflows } = createWorkflowsExtensions();
    install.mockRejectedValueOnce(Boom.forbidden('forbidden'));

    const error = await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      ...workflows,
      isServerless: false,
    })
      .enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
      .catch((e) => e);

    expect(error).toMatchObject({ statusCode: 403, message: expect.stringContaining('forbidden') });
    expect(error.message).not.toContain('call _enable again');
  });

  it('fails when a concurrent call bound the space to another account while this one installed', async () => {
    const { core, rebind } = createCore();
    const { install, ...workflows } = createWorkflowsExtensions();
    install.mockImplementationOnce(async () => rebind('account-2'));

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...workflows,
        isServerless: false,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('[account-2]'),
    });
  });

  it('fails when an installed workflow is not bound to the account, naming it', async () => {
    const { core } = createCore();

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        ...createWorkflowsExtensions({ bindInstalls: false }),
        isServerless: false,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('[system-sources-ki-onboarding-bound]'),
    });
  });

  it('refuses with 400 when workflows are not available', async () => {
    const { core, bindWorkload } = createCore();

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        workflowsExtensions: undefined,
        workflowsManagement: undefined,
        isServerless: false,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });
});
