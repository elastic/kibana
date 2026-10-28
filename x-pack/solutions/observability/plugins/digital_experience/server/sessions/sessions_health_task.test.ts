/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RunContext, TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { SessionsStatus } from '../../common/sessions';
import {
  SESSIONS_HEALTH_TASK_ID,
  SESSIONS_HEALTH_TASK_TYPE,
  registerSessionsHealthTask,
  scheduleSessionsHealthTask,
} from './sessions_health_task';
import { getSessionsStatus } from './sessions_setup';

jest.mock('./sessions_setup');

const settings = { frequency: '1m', partitions: 1 };

const healthyStatus: SessionsStatus = {
  installed: true,
  health: 'healthy',
  state: 'started',
  installedVersion: 1,
  currentVersion: 1,
  needsUpdate: false,
  reason: null,
  lagSeconds: 30,
  configured: settings,
  installedPartitions: 1,
  transforms: [],
};

const setup = () => {
  const core = coreMock.createSetup();
  const logger = loggingSystemMock.createLogger();
  const taskManager = taskManagerMock.createSetup();
  registerSessionsHealthTask({ core, logger, taskManager, settings });
  const definitions: TaskDefinitionRegistry = taskManager.registerTaskDefinitions.mock.calls[0][0];
  const definition = definitions[SESSIONS_HEALTH_TASK_TYPE];
  const signal = new AbortController().signal;
  const run = () => definition.createTaskRunner({ signal } as RunContext).run();
  return { core, logger, definition, run, signal };
};

describe('sessions health task', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('registers a tiny, single-attempt maintenance task', () => {
    const { definition } = setup();
    expect(definition).toEqual(
      expect.objectContaining({
        timeout: '1m',
        maxAttempts: 1,
        cost: TaskCost.Tiny,
        priority: TaskPriority.Maintenance,
      })
    );
  });

  it('reads the status with the internal user and the task signal, and logs nothing when healthy', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue(healthyStatus);
    const { core, logger, run, signal } = setup();
    const [coreStart] = await core.getStartServices();

    expect(await run()).toEqual({ state: {} });

    expect(getSessionsStatus).toHaveBeenCalledWith(coreStart.elasticsearch.client.asInternalUser, {
      settings,
      signal,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each(['degraded', 'lagging'] as const)('warns when the transforms are %s', async (health) => {
    jest
      .mocked(getSessionsStatus)
      .mockResolvedValue({ ...healthyStatus, health, reason: '12 minutes behind' });
    const { logger, run } = setup();

    await run();

    expect(logger.warn).toHaveBeenCalledWith(
      `Sessions transforms are ${health} (state: started): 12 minutes behind`
    );
  });

  it('warns that a manage user must enable sessions again when they need an update', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue({
      ...healthyStatus,
      health: 'outdated',
      needsUpdate: true,
      reason: 'Configured 2 partition(s) at 1m, installed 1.',
    });
    const { logger, run } = setup();

    await run();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '"Set up and update session summaries" privilege must enable sessions again'
      )
    );
  });

  it('only reads: never creates, updates or starts a transform', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue({ ...healthyStatus, health: 'degraded' });
    const { core, run } = setup();
    const [coreStart] = await core.getStartServices();
    const { transform } = coreStart.elasticsearch.client.asInternalUser;

    await run();

    expect(transform.putTransform).not.toHaveBeenCalled();
    expect(transform.updateTransform).not.toHaveBeenCalled();
    expect(transform.startTransform).not.toHaveBeenCalled();
  });
});

describe('scheduleSessionsHealthTask', () => {
  it('schedules the task every 5 minutes', async () => {
    const taskManager = taskManagerMock.createStart();
    await scheduleSessionsHealthTask({ logger: loggingSystemMock.createLogger(), taskManager });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: SESSIONS_HEALTH_TASK_ID,
      taskType: SESSIONS_HEALTH_TASK_TYPE,
      schedule: { interval: '5m' },
      params: {},
      state: {},
    });
  });

  it('logs instead of throwing when scheduling fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const taskManager = taskManagerMock.createStart();
    taskManager.ensureScheduled.mockRejectedValue(new Error('task manager unavailable'));

    await expect(scheduleSessionsHealthTask({ logger, taskManager })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to schedule the sessions health task: task manager unavailable'
    );
  });
});
