/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
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
  const workflowsManagement = {
    management: {
      getWorkflow: async (id: string) =>
        boundTo.has(id) ? { definition: { settings: { run_as: boundTo.get(id) } } } : null,
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
}: {
  enabled?: boolean;
  canManageSecurity?: boolean;
  roleCount?: number;
  boundAccountId?: string;
  privilegeProbeFails?: boolean;
} = {}) => {
  const hasPrivileges = jest.fn(async () => {
    if (privilegeProbeFails) {
      throw new Error('boom');
    }
    return { has_all_requested: canManageSecurity };
  });
  const bindWorkload = jest.fn(async () => ({}));
  const queryRole = jest.fn(async () => ({ total: roleCount }));
  const core = {
    security: {
      serviceAccounts: {
        isEnabled: () => enabled,
        bindWorkload,
        getWorkloadBinding: jest.fn(async () =>
          boundAccountId ? { serviceAccountId: boundAccountId } : null
        ),
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
  return { core, bindWorkload, queryRole, hasPrivileges };
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

    const result = await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      ...workflows,
      isServerless: false,
    }).enable({ request, spaceId: 'marketing', serviceAccountId: 'account-1' });

    const expectedIds = [
      'system-sources-ki-onboarding-bound',
      'system-nightshift-discovery-bound',
      'system-sources-ki-sync-bound',
      'system-nightshift-cleanup-bound',
      'system-nightshift-source-reconciliation-bound',
    ];
    expect(result.workflowIds).toEqual(expectedIds);
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

  it('runs the setups of one space one after another', async () => {
    const { core } = createCore();
    const { install, ...workflows } = createWorkflowsExtensions();
    const running: boolean[] = [];
    let overlapped = false;
    install.mockImplementation(async () => {
      overlapped = overlapped || running.includes(true);
      running.push(true);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running.pop();
    });
    const service = createDetectionEngineSetupService({
      core,
      spaces: undefined,
      ...workflows,
      isServerless: false,
    });

    await Promise.allSettled([
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' }),
      service.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' }),
    ]);

    expect(install).toHaveBeenCalledTimes(10);
    expect(overlapped).toBe(false);
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
