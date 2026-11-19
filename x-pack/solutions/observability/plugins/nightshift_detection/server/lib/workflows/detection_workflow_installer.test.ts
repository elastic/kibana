/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DetectionWorkflowInstaller } from './detection_workflow_installer';

const request = httpServerMock.createKibanaRequest();

function createInstaller({
  runAs,
  runAsAfterEnable = runAs,
  installError,
  updateError,
}: {
  runAs?: string;
  /** What the workflow runs as once it is on, to act as a concurrent `_enable` that rebound it. */
  runAsAfterEnable?: string;
  installError?: Error;
  updateError?: Error;
}) {
  let currentRunAs = runAs;
  const install = jest.fn(async () => {
    if (installError) {
      throw installError;
    }
  });
  const updateWorkflow = jest.fn(async () => {
    if (updateError) {
      throw updateError;
    }
    currentRunAs = runAsAfterEnable;
  });
  const getWorkflow = jest.fn(async () => ({ definition: { settings: { run_as: currentRunAs } } }));
  const installer = new DetectionWorkflowInstaller(
    {
      getClient: async () => ({ managedWorkflows: { install } }),
    } as unknown as WorkflowsExtensionsServerPluginStart,
    { management: { getWorkflow, updateWorkflow } } as unknown as WorkflowsServerPluginSetup
  );

  return { installer, updateWorkflow };
}

describe('DetectionWorkflowInstaller.install', () => {
  it('fails with 500 when the installed workflow does not run as the account, switching nothing on', async () => {
    const { installer, updateWorkflow } = createInstaller({ runAs: 'another-account' });

    await expect(
      installer.install({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(updateWorkflow).not.toHaveBeenCalled();
  });

  it('keeps the status of a failed install and only suggests a retry for server errors', async () => {
    const forbidden = createInstaller({ installError: Boom.forbidden('no manage_security') });
    const unavailable = createInstaller({ installError: Boom.serverUnavailable('not ready') });

    const forbiddenError = await forbidden.installer
      .install({ request, spaceId: 'default', serviceAccountId: 'account-1' })
      .catch((error) => error);
    const unavailableError = await unavailable.installer
      .install({ request, spaceId: 'default', serviceAccountId: 'account-1' })
      .catch((error) => error);

    expect(forbiddenError).toMatchObject({ statusCode: 403 });
    expect(forbiddenError.message).not.toContain('_enable again');
    expect(unavailableError).toMatchObject({ statusCode: 503 });
    expect(unavailableError.message).toContain('Call _enable again');
  });
});

describe('DetectionWorkflowInstaller.enable', () => {
  it('turns the workflow on while it still runs as the account', async () => {
    const { installer, updateWorkflow } = createInstaller({ runAs: 'account-1' });

    await installer.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' });

    expect(updateWorkflow).toHaveBeenCalledWith(
      expect.stringContaining('default'),
      { enabled: true },
      'default',
      request
    );
  });

  it('fails with 500 when a concurrent call rebound the workflow while it was turned on', async () => {
    const { installer } = createInstaller({
      runAs: 'account-1',
      runAsAfterEnable: 'account-2',
    });

    await expect(
      installer.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 500, message: expect.stringContaining('_enable again') });
  });

  it('suggests a retry when the workflow is gone by the time it is turned on', async () => {
    const { installer } = createInstaller({
      runAs: 'account-1',
      updateError: new Error('Workflow with id x not found'),
    });

    await expect(
      installer.enable({ request, spaceId: 'default', serviceAccountId: 'account-1' })
    ).rejects.toMatchObject({ statusCode: 500, message: expect.stringContaining('_enable again') });
  });
});
