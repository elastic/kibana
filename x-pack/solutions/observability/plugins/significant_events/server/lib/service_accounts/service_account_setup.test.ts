/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { createDetectionEngineSetupService, SETUP_WORKFLOW_IDS } from './service_account_setup';

const request = httpServerMock.createKibanaRequest();

const createWorkflowsExtensions = () => {
  const install = jest.fn(async (..._args: unknown[]) => undefined);
  const workflowsExtensions = {
    getClient: async () => ({ managedWorkflows: { install } }),
  } as unknown as WorkflowsExtensionsServerPluginStart;
  return { workflowsExtensions, install };
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
      workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
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
        workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
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
        workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
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
        workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
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
        workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
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
          workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
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
      workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
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
        workflowsExtensions: createWorkflowsExtensions().workflowsExtensions,
        isServerless: false,
      }).getStatus({ request, spaceId: 'default' })
    ).toMatchObject({ canSetUp: false });
  });
});

describe('createDetectionEngineSetupService.enable workflows', () => {
  it('installs every setup workflow in the space, bound to the account', async () => {
    const { core } = createCore();
    const { workflowsExtensions, install } = createWorkflowsExtensions();

    const result = await createDetectionEngineSetupService({
      core,
      spaces: undefined,
      workflowsExtensions,
      isServerless: false,
    }).enable({ request, spaceId: 'marketing', serviceAccountId: 'account-1' });

    expect(result.workflowIds).toEqual([...SETUP_WORKFLOW_IDS]);
    expect(install.mock.calls.map(([, workflowId]) => workflowId)).toEqual([...SETUP_WORKFLOW_IDS]);
    expect(install).toHaveBeenCalledWith('significantEvents', SETUP_WORKFLOW_IDS[0], {
      spaceId: 'marketing',
      workflowIdSuffix: 'marketing',
      values: { serviceAccountId: 'account-1' },
    });
  });

  it('installs nothing when the account cannot be bound', async () => {
    const { core, bindWorkload } = createCore();
    bindWorkload.mockRejectedValueOnce(new Error('bind failed'));
    const { workflowsExtensions, install } = createWorkflowsExtensions();

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        workflowsExtensions,
        isServerless: false,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toThrow('bind failed');
    expect(install).not.toHaveBeenCalled();
  });

  it('refuses with 400 when workflows are not available', async () => {
    const { core, bindWorkload } = createCore();

    await expect(
      createDetectionEngineSetupService({
        core,
        spaces: undefined,
        workflowsExtensions: undefined,
        isServerless: false,
      }).enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(bindWorkload).not.toHaveBeenCalled();
  });
});
