/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { PND_RULE_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { initializeManagedWorkflows } from './initialize_managed_workflows';

const makeState = (spaceId: string) => ({
  workflowId: `wf-${spaceId}`,
  spaceId,
  definitionId: 'some-worker',
  templateValues: null,
  documentVersion: 1,
});

const createDependencies = () => {
  const client = {
    install: jest.fn(async (_id: string, _options: Record<string, unknown>) => undefined),
    uninstall: jest.fn(async (_id: string, _options: Record<string, unknown>) => undefined),
    ready: jest.fn(async () => undefined),
    execute: jest.fn(),
    getWorkflowStatus: jest.fn(),
    getInstalledWorkflowState: jest.fn(),
    listInstalledWorkflowStates: jest.fn().mockResolvedValue([]),
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

    expect(client.install).toHaveBeenCalledTimes(1);
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

  describe('ensureAgentForSpace', () => {
    it('calls ensureAgentForSpace once per unique space from installed worker states', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();
      const ensureAgentForSpace = jest.fn(async () => undefined);
      client.listInstalledWorkflowStates.mockResolvedValue([
        makeState('space-a'),
        makeState('space-b'),
        makeState('space-a'), // duplicate — should only call once
      ]);

      await initializeManagedWorkflows({ workflowsExtensions, logger, ensureAgentForSpace });

      expect(ensureAgentForSpace).toHaveBeenCalledTimes(2);
      expect(ensureAgentForSpace).toHaveBeenCalledWith('space-a');
      expect(ensureAgentForSpace).toHaveBeenCalledWith('space-b');
    });

    it('excludes the global workflow space', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();
      const ensureAgentForSpace = jest.fn(async () => undefined);
      client.listInstalledWorkflowStates.mockResolvedValue([
        makeState(GLOBAL_WORKFLOW_SPACE_ID),
        makeState('space-a'),
      ]);

      await initializeManagedWorkflows({ workflowsExtensions, logger, ensureAgentForSpace });

      expect(ensureAgentForSpace).toHaveBeenCalledTimes(1);
      expect(ensureAgentForSpace).toHaveBeenCalledWith('space-a');
      expect(ensureAgentForSpace).not.toHaveBeenCalledWith(GLOBAL_WORKFLOW_SPACE_ID);
    });

    it('does not call ensureAgentForSpace when not provided', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();
      client.listInstalledWorkflowStates.mockResolvedValue([makeState('space-a')]);

      await initializeManagedWorkflows({ workflowsExtensions, logger });

      expect(client.listInstalledWorkflowStates).not.toHaveBeenCalled();
    });

    it('logs a warning when ensureAgentForSpace fails for a space', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();
      const ensureAgentForSpace = jest.fn().mockRejectedValueOnce(new Error('agent ensure failed'));
      client.listInstalledWorkflowStates.mockResolvedValue([makeState('space-a')]);

      await initializeManagedWorkflows({ workflowsExtensions, logger, ensureAgentForSpace });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"space-a"') && expect.stringContaining('agent ensure failed')
      );
    });

    it('logs a warning when listInstalledWorkflowStates throws', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();
      const ensureAgentForSpace = jest.fn(async () => undefined);
      client.listInstalledWorkflowStates.mockRejectedValue(new Error('storage unavailable'));

      await initializeManagedWorkflows({ workflowsExtensions, logger, ensureAgentForSpace });

      expect(ensureAgentForSpace).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('storage unavailable'));
    });
  });
});
