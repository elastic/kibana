/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_DARK_WATCH_WORKER_WORKFLOW_IDS,
  PND_MANAGED_WATCH_WORKFLOW_IDS,
  PND_WATCH_FLOOR_WORKFLOW_ID,
  PND_RULE_WORKFLOW_IDS,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { ManagedWorkflowInstanceState } from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { initializeManagedWorkflows } from './initialize_managed_workflows';

const PND_STATIC_GLOBAL_WORKFLOW_IDS = [
  ...PND_RULE_WORKFLOW_IDS,
  ...PND_DARK_WATCH_WORKER_WORKFLOW_IDS,
] as const;

const createDependencies = () => {
  const client = {
    install: jest.fn(async (_id: string, _options: Record<string, unknown>) => undefined),
    uninstall: jest.fn(async (_id: string, _options: Record<string, unknown>) => undefined),
    ready: jest.fn(async () => undefined),
    execute: jest.fn(),
    getWorkflowStatus: jest.fn(),
    getInstalledWorkflowState: jest.fn(),
    listInstalledWorkflowStates: jest.fn(async (): Promise<ManagedWorkflowInstanceState[]> => []),
  };
  const workflowsExtensions = {
    initManagedWorkflowsClient: jest.fn(async () => client),
  } as unknown as WorkflowsExtensionsServerPluginStart;
  const logger = loggerMock.create();
  return { client, workflowsExtensions, logger };
};

describe('initializeManagedWorkflows', () => {
  it('installs global rule and Dark Worker workflows before reconciliation', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.install.mock.calls.map(([id]) => id)).toEqual([...PND_STATIC_GLOBAL_WORKFLOW_IDS]);
    expect(client.install).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ workflowIdSuffix: expect.any(String) })
    );
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('migrates stored values and removes legacy global watches before ready', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.listInstalledWorkflowStates = jest.fn(async () => [
      {
        workflowId: `${PND_WATCH_FLOOR_WORKFLOW_ID}-space-a`,
        spaceId: 'space-a',
        definitionId: PND_WATCH_FLOOR_WORKFLOW_ID,
        templateValues: { autonomyLevel: 'assisted' },
        documentVersion: 7,
      },
      {
        workflowId: PND_MANAGED_WATCH_WORKFLOW_IDS[1],
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        definitionId: PND_MANAGED_WATCH_WORKFLOW_IDS[1],
        templateValues: null,
        documentVersion: 3,
      },
    ]);

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.install).toHaveBeenCalledWith(PND_WATCH_FLOOR_WORKFLOW_ID, {
      spaceId: 'space-a',
      workflowId: `${PND_WATCH_FLOOR_WORKFLOW_ID}-space-a`,
      values: {
        settingsVersion: 1,
        autonomyLevel: 'assisted',
      },
    });
    expect(client.uninstall).toHaveBeenCalledWith(PND_MANAGED_WATCH_WORKFLOW_IDS[1], {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      workflowId: PND_MANAGED_WATCH_WORKFLOW_IDS[1],
    });
    expect(client.ready.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.install.mock.invocationCallOrder.at(-1) ?? 0
    );
    expect(client.ready.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.uninstall.mock.invocationCallOrder[0]
    );
  });

  it('degrades without reconciliation when the migration read fails', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.listInstalledWorkflowStates = jest.fn(async () => {
      throw new Error('storage unavailable');
    });

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.ready).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('reconciliation skipped because initialization degraded')
    );
  });

  it('degrades without reconciliation when the installed-state list hits the read cap', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.listInstalledWorkflowStates = jest.fn(async () =>
      Array.from({ length: 1000 }, (_, index) => ({
        workflowId: `wf-${index}`,
        spaceId: 'space-a',
        definitionId: PND_WATCH_FLOOR_WORKFLOW_ID,
        templateValues: {
          settingsVersion: 1,
          autonomyLevel: 'manual',
        },
        documentVersion: 1,
      }))
    );

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.ready).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1000-document read cap'));
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

  it('does not reconcile when persisted settings cannot be migrated', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.listInstalledWorkflowStates = jest.fn(async () => [
      {
        workflowId: `${PND_WATCH_FLOOR_WORKFLOW_ID}-space-a`,
        spaceId: 'space-a',
        definitionId: PND_WATCH_FLOOR_WORKFLOW_ID,
        templateValues: {
          settingsVersion: 2,
          autonomyLevel: 'manual',
        },
        documentVersion: 7,
      },
    ]);

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.ready).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Unsupported settings version for PND watch "${PND_WATCH_FLOOR_WORKFLOW_ID}": 2`
      )
    );
  });

  it('does not reinstall values that already match the current settings shape', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.listInstalledWorkflowStates = jest.fn(async () => [
      {
        workflowId: `${PND_WATCH_FLOOR_WORKFLOW_ID}-space-a`,
        spaceId: 'space-a',
        definitionId: PND_WATCH_FLOOR_WORKFLOW_ID,
        templateValues: {
          settingsVersion: 1,
          autonomyLevel: 'manual',
        },
        documentVersion: 7,
      },
    ]);

    await initializeManagedWorkflows({ workflowsExtensions, logger });

    expect(client.install.mock.calls.map(([id]) => id)).toEqual([...PND_STATIC_GLOBAL_WORKFLOW_IDS]);
    expect(client.ready).toHaveBeenCalledTimes(1);
  });

  it('returns the managed client when ready reconciliation fails', async () => {
    const { client, workflowsExtensions, logger } = createDependencies();
    client.ready.mockRejectedValueOnce(new Error('reconciliation failed'));

    await expect(initializeManagedWorkflows({ workflowsExtensions, logger })).resolves.toBe(client);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reconciliation failed'));
  });
});
