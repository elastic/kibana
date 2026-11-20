/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, LoggerFactory } from '@kbn/core/server';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import moment from 'moment';
import type { SLOConfig, SLOPluginStartDependencies } from '../../../types';
import { runSliRetention } from './run_sli_retention';
import { SliRetentionTask, TYPE } from './sli_retention_task';

jest.mock('./run_sli_retention', () => ({
  runSliRetention: jest.fn().mockResolvedValue([]),
}));

const mockRunSliRetention = runSliRetention as jest.MockedFunction<typeof runSliRetention>;

const TASK_ID = `${TYPE}:1.0.0`;

const baseConfig: SLOConfig = {
  sloOrphanSummaryCleanUpTaskEnabled: true,
  tempSummaryCleanupTaskEnabled: true,
  healthScanTaskEnabled: true,
  staleInstancesCleanupTaskEnabled: false,
  compositeSloSummaryTaskEnabled: true,
  sliIndexRounding: 'M',
  sliRetentionTaskEnabled: true,
  sliRetentionPeriod: moment.duration(180, 'days'),
  enabled: true,
  experimental: { ruleFormV2: { enabled: false } },
};

const createTaskInstance = (id: string = TASK_ID): ConcreteTaskInstance => {
  const now = new Date('2026-11-17T00:00:00.000Z');
  return {
    id,
    taskType: TYPE,
    params: {},
    state: {},
    scheduledAt: now,
    attempts: 0,
    status: TaskStatus.Running,
    runAt: now,
    startedAt: now,
    retryAt: null,
    ownerId: null,
  };
};

const createStartPlugins = () => {
  const taskManager = taskManagerMock.createStart();
  const plugins = {
    licensing: {
      getLicense: jest.fn().mockResolvedValue({ hasAtLeast: jest.fn().mockReturnValue(true) }),
    },
    taskManager,
  } as unknown as SLOPluginStartDependencies;
  return { plugins, taskManager };
};

describe('SliRetentionTask', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let taskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;

  const createTask = (config: Partial<SLOConfig> = {}) =>
    new SliRetentionTask({
      core: coreSetup as CoreSetup,
      config: { ...baseConfig, ...config },
      taskManager: taskManagerSetup,
      logFactory: loggingSystemMock.create() as unknown as LoggerFactory,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([
      {
        elasticsearch: {
          client: { asInternalUser: elasticsearchServiceMock.createElasticsearchClient() },
        },
      } as never,
      {} as never,
      {} as never,
    ]);
    taskManagerSetup = taskManagerMock.createSetup();
  });

  it('schedules the task daily when enabled', async () => {
    const { plugins, taskManager } = createStartPlugins();

    await createTask().start(plugins);

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: TASK_ID, taskType: TYPE, schedule: { interval: '1d' } })
    );
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
  });

  it('removes the task when disabled', async () => {
    const { plugins, taskManager } = createStartPlugins();

    await createTask({ sliRetentionTaskEnabled: false }).start(plugins);

    expect(taskManager.removeIfExists).toHaveBeenCalledWith(TASK_ID);
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });

  it('deletes an outdated task instance', async () => {
    const task = createTask();
    await task.start(createStartPlugins().plugins);

    const result = await task.runTask(
      createTaskInstance(`${TYPE}:0.0.1`),
      coreSetup as CoreSetup,
      new AbortController().signal
    );

    expect(result).toEqual({ state: {}, shouldDeleteTask: true });
    expect(mockRunSliRetention).not.toHaveBeenCalled();
  });

  it('runs the retention with the configured period', async () => {
    const task = createTask({ sliRetentionPeriod: moment.duration(365, 'days') });
    await task.start(createStartPlugins().plugins);

    await task.runTask(createTaskInstance(), coreSetup as CoreSetup, new AbortController().signal);

    expect(mockRunSliRetention).toHaveBeenCalledWith(
      expect.objectContaining({ retentionMs: 365 * 24 * 60 * 60 * 1000 })
    );
  });
});
