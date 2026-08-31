/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { PND_RULE_WORKFLOW_IDS } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { initializeManagedWorkflows } from './initialize_managed_workflows';

const createDependencies = () => {
  const client = {
    install: jest.fn(async (_id: string, _options: Record<string, unknown>) => undefined),
    uninstall: jest.fn(async (_id: string, _options: Record<string, unknown>) => undefined),
    ready: jest.fn(async () => undefined),
    execute: jest.fn(),
    getWorkflowStatus: jest.fn(),
    getInstalledWorkflowState: jest.fn(),
  };
  const workflowsExtensions = {
    initManagedWorkflowsClient: jest.fn(async () => client),
  } as unknown as WorkflowsExtensionsServerPluginStart;
  const logger = loggerMock.create();
  return { client, workflowsExtensions, logger };
};

describe('initializeManagedWorkflows', () => {
  it('installs only global rule workflows before reconciliation', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.install.mock.calls.map(([id]) => id)).toEqual(PND_RULE_WORKFLOW_IDS);
    expect(client.install).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ workflowIdSuffix: expect.any(String) })
    );
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('does not reconcile when a required rule workflow install fails', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.install.mockRejectedValueOnce(new Error('rule workflow install failed'));

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.ready).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('rule workflow install failed')
    );
  });

  it('returns the managed client when ready reconciliation fails', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.ready.mockRejectedValueOnce(new Error('reconciliation failed'));

    await expect(initializeManagedWorkflows({ workflowsExtensions, logger })).resolves.toBe(client);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reconciliation failed'));
  });
});
