/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DetectionWorkflowInstaller } from './detection_workflow_installer';

const request = httpServerMock.createKibanaRequest();

function createInstaller({ runAs }: { runAs?: string }) {
  const install = jest.fn(async () => {});
  const updateWorkflow = jest.fn(async () => {});
  const getWorkflow = jest.fn(async () => ({ definition: { settings: { run_as: runAs } } }));
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
});
