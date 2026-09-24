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

import { COALESCE_REBUILD_TASK_TYPE, registerCoalesceRebuildTask } from './coalesce_rebuild_task';

jest.mock('../services/lookup', () => ({
  ensureLookupIndexCurrent: jest.fn().mockResolvedValue(undefined),
  reconcileCoalesced: jest.fn().mockResolvedValue('clean'),
}));

const INDEX = '.items-default-ranges';

describe('coalesce rebuild task', () => {
  const taskManager = taskManagerMock.createSetup();
  const logger = loggingSystemMock.createLogger();
  const coreSetup = coreMock.createSetup();

  const runOnce = async (): Promise<void> => {
    registerCoalesceRebuildTask({
      getStartServices: coreSetup.getStartServices,
      logger,
      taskManager,
    });
    const [[definitions]] = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls;
    const definition = (definitions as Record<string, TaskDefinition>)[COALESCE_REBUILD_TASK_TYPE];
    const runner = definition.createTaskRunner({
      taskInstance: { id: 'task', params: { index: INDEX, type: 'ip_range' } },
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
});
