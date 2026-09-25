/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { RunContext, TaskDefinition } from '@kbn/task-manager-plugin/server';

import { ensureLookupIndexCurrent, reconcileCoalesced } from '../services/lookup';

import {
  COALESCE_REBUILD_TASK_TYPE,
  coalesceRebuildTaskId,
  registerCoalesceRebuildTask,
  scheduleCoalesceRebuild,
} from './coalesce_rebuild_task';

jest.mock('../services/lookup', () => ({
  ...jest.requireActual('../services/lookup'),
  ensureLookupIndexCurrent: jest.fn().mockResolvedValue(undefined),
  reconcileCoalesced: jest.fn().mockResolvedValue('clean'),
}));

// the task is keyed by the concrete index; the alias is the name reads and writes use
const INDEX = '.value-list-v2-default-ranges';
const ALIAS = '.items-default-ranges';

describe('coalesce rebuild task', () => {
  const taskManager = taskManagerMock.createSetup();
  const logger = loggingSystemMock.createLogger();
  const coreSetup = coreMock.createSetup();

  const runOnce = async (index = INDEX): Promise<void> => {
    registerCoalesceRebuildTask({
      getStartServices: coreSetup.getStartServices,
      logger,
      taskManager,
    });
    const [[definitions]] = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls;
    const definition = (definitions as Record<string, TaskDefinition>)[COALESCE_REBUILD_TASK_TYPE];
    const runner = definition.createTaskRunner({
      taskInstance: { id: 'task', params: { index, type: 'ip_range' } },
    } as unknown as RunContext);
    await runner.run();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('brings the index mapping up to date before it reconciles, so the first writer after an upgrade is safe', async () => {
    await runOnce();

    const [[upgradeCall]] = (ensureLookupIndexCurrent as jest.Mock).mock.calls;
    expect(upgradeCall).toEqual(expect.objectContaining({ index: INDEX, type: 'ip_range' }));
    const [upgradeOrder] = (ensureLookupIndexCurrent as jest.Mock).mock.invocationCallOrder;
    const [reconcileOrder] = (reconcileCoalesced as jest.Mock).mock.invocationCallOrder;
    expect(upgradeOrder).toBeLessThan(reconcileOrder);
  });

  it('reconciles with the internal client and the task parameters', async () => {
    await runOnce();

    const [[reconcileCall]] = (reconcileCoalesced as jest.Mock).mock.calls;
    expect(reconcileCall).toEqual(expect.objectContaining({ index: INDEX, type: 'ip_range' }));
  });

  it('refuses a task document whose index is not a value list name, before touching Elasticsearch', async () => {
    await expect(runOnce('.kibana')).rejects.toThrow('is not a value list lookup index name');

    expect(ensureLookupIndexCurrent).not.toHaveBeenCalled();
    expect(reconcileCoalesced).not.toHaveBeenCalled();
  });

  it('refuses a task document keyed by the alias, so a list never has two tasks', async () => {
    await expect(runOnce(ALIAS)).rejects.toThrow('is not a value list lookup index name');

    expect(reconcileCoalesced).not.toHaveBeenCalled();
  });
});

describe('scheduleCoalesceRebuild', () => {
  const logger = loggingSystemMock.createLogger();
  // the scheduler enqueues in the background; let its promise chain run to the end
  const settle = async (): Promise<void> => {
    for (let tick = 0; tick < 5; tick++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };
  const startMock = (): ReturnType<typeof taskManagerMock.createStart> => {
    const taskManager = taskManagerMock.createStart();
    (taskManager.get as jest.Mock).mockResolvedValue(undefined);
    (taskManager.ensureScheduled as jest.Mock).mockResolvedValue(undefined);
    (taskManager.runSoon as jest.Mock).mockResolvedValue(undefined);
    return taskManager;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keys the task by the concrete index, the same id whether the list is shared or restricted', async () => {
    const taskManager = startMock();

    scheduleCoalesceRebuild({ index: INDEX, logger, taskManager, type: 'ip_range' });
    await settle();

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: coalesceRebuildTaskId(INDEX),
        params: { index: INDEX, type: 'ip_range' },
      })
    );
    expect(coalesceRebuildTaskId(INDEX)).toBe(`${COALESCE_REBUILD_TASK_TYPE}:${INDEX}`);
  });

  it('refuses to schedule under the alias before reaching Task Manager', async () => {
    const taskManager = startMock();

    expect(() =>
      scheduleCoalesceRebuild({ index: ALIAS, logger, taskManager, type: 'ip_range' })
    ).toThrow('is not a value list lookup index name');
    await settle();

    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });
});
