/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { createBoundWorkflowsInstaller } from './bound_workflows_installer';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from './managed_workflow_owner';

describe('createBoundWorkflowsInstaller', () => {
  const setup = () => {
    const ownerClient = { disable: jest.fn().mockResolvedValue(true) };
    const workflowsExtensions = {
      initManagedWorkflowsClient: jest.fn().mockResolvedValue(ownerClient),
    } as unknown as WorkflowsExtensionsServerPluginStart;
    const installer = createBoundWorkflowsInstaller({
      getStartDeps: async () => ({ core: {} as CoreStart, workflowsExtensions }),
    });
    return { installer, ownerClient, workflowsExtensions };
  };

  it('switches a bound workflow off through the owner, for the given space only', async () => {
    const { installer, ownerClient, workflowsExtensions } = setup();

    await expect(installer.disable({ spaceId: 'space-b', workflowId: 'wf' })).resolves.toBe(true);

    // The owner's request-less API needs no `manage_security` caller.
    expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
    );
    expect(ownerClient.disable).toHaveBeenCalledTimes(1);
    expect(ownerClient.disable).toHaveBeenCalledWith('wf', {
      spaceId: 'space-b',
      workflowIdSuffix: 'space-b',
    });
  });
});
