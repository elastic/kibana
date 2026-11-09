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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  SESSIONS_HEALTH_TASK_ID,
  SESSIONS_HEALTH_TASK_TYPE,
  getLastAutoUpdateState,
  registerSessionsHealthTask,
  scheduleSessionsHealthTask,
} from './sessions_health_task';
import type { SessionsApiKeys } from './sessions_api_key';
import { getApiKeyStatus, updateSessionsWithApiKey } from './sessions_auto_update';
import { getSessionsStatus } from './sessions_setup';

jest.mock('./sessions_setup');
jest.mock('./sessions_auto_update');

const settings = { frequency: '1m', partitions: 1 };

const healthyStatus: SessionsStatus = {
  installed: true,
  health: 'healthy',
  state: 'started',
  installedVersion: 1,
  currentVersion: 1,
  needsUpdate: false,
  autoUpdate: false,
  apiKeyInvalid: false,
  rebuilding: false,
  reason: null,
  lagSeconds: 30,
  configured: settings,
  installedPartitions: 1,
  enabledBy: 'ana',
  enabledAt: '2026-10-27T11:00:00.000Z',
  authorization: { roles: ['superuser'], apiKeyId: null, apiKeyName: null, serviceAccount: null },
  transforms: [],
};

const apiKeys = { available: true } as unknown as SessionsApiKeys;

const outdatedStatus: SessionsStatus = {
  ...healthyStatus,
  health: 'outdated',
  installedVersion: 0,
  needsUpdate: true,
  autoUpdate: true,
  reason: 'Sessions transforms are from version 0.',
};

const setup = (state: Record<string, unknown> = {}) => {
  const core = coreMock.createSetup();
  const logger = loggingSystemMock.createLogger();
  const taskManager = taskManagerMock.createSetup();
  registerSessionsHealthTask({ core, logger, taskManager, settings, apiKeys });
  const definitions: TaskDefinitionRegistry = taskManager.registerTaskDefinitions.mock.calls[0][0];
  const definition = definitions[SESSIONS_HEALTH_TASK_TYPE];
  const signal = new AbortController().signal;
  const run = () =>
    definition.createTaskRunner({ signal, taskInstance: { state } } as unknown as RunContext).run();
  return { core, logger, definition, run, signal };
};

describe('sessions health task', () => {
  beforeEach(() => {
    jest.mocked(getApiKeyStatus).mockImplementation(async (status) => ({
      status,
      keyId: status.apiKeyInvalid ? 'key-1' : null,
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('registers a tiny, single-attempt maintenance task', () => {
    const { definition } = setup();
    expect(definition).toEqual(
      expect.objectContaining({
        timeout: '2m',
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

    expect(await run()).toEqual({
      state: { health: 'healthy', needsUpdate: false, newerVersion: false },
    });

    expect(getSessionsStatus).toHaveBeenCalledWith(coreStart.elasticsearch.client.asInternalUser, {
      settings,
      signal,
    });
    expect(getApiKeyStatus).toHaveBeenCalledWith(healthyStatus, apiKeys, {
      checkKey: true,
      logger,
      getAutoUpdateState: expect.any(Function),
    });
    expect(updateSessionsWithApiKey).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('updates outdated transforms with their stored API key, then reports the new status', async () => {
    jest
      .mocked(getSessionsStatus)
      .mockResolvedValueOnce(outdatedStatus)
      .mockResolvedValueOnce(healthyStatus);
    jest.mocked(updateSessionsWithApiKey).mockResolvedValue(true);
    const { core, logger, run } = setup();
    const [coreStart] = await core.getStartServices();

    expect(await run()).toEqual({
      state: { health: 'healthy', needsUpdate: false, newerVersion: false },
    });
    expect(updateSessionsWithApiKey).toHaveBeenCalledWith({
      status: outdatedStatus,
      apiKeys,
      logger,
      audit: coreStart.security.audit.withoutRequest,
      settings,
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Updated the sessions transforms to version 1 and the configured settings with their stored API key.'
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('leaves an update to a user when there is no usable stored API key', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue({ ...outdatedStatus, autoUpdate: false });
    const { logger, run } = setup();

    await run();

    expect(updateSessionsWithApiKey).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('privilege must enable sessions again')
    );
  });

  it('logs a failed automatic update once, and keeps asking for a manual update', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue(outdatedStatus);
    jest.mocked(updateSessionsWithApiKey).mockRejectedValue(new Error('unable to authenticate'));
    const first = setup();

    expect(await first.run()).toEqual({
      state: {
        health: 'outdated',
        needsUpdate: true,
        newerVersion: false,
        autoUpdateError: 'unable to authenticate',
      },
    });
    expect(first.logger.error).toHaveBeenCalledWith(
      'Could not update the sessions transforms with their stored API key: unable to authenticate'
    );

    const second = setup({
      health: 'outdated',
      needsUpdate: true,
      newerVersion: false,
      autoUpdateError: 'unable to authenticate',
    });
    await second.run();
    expect(second.logger.error).not.toHaveBeenCalled();
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

  it('warns once about a deleted API key, without trying to update with it', async () => {
    const invalid: SessionsStatus = { ...healthyStatus, apiKeyInvalid: true };
    jest.mocked(getSessionsStatus).mockResolvedValue(invalid);
    const first = setup();

    expect(await first.run()).toEqual({
      state: {
        health: 'healthy',
        needsUpdate: false,
        newerVersion: false,
        invalidApiKeyId: 'key-1',
      },
    });
    expect(updateSessionsWithApiKey).not.toHaveBeenCalled();
    expect(first.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Sessions keep updating, but upgrades and settings changes no longer apply automatically'
      )
    );
    expect(first.logger.error).not.toHaveBeenCalled();

    const second = setup({
      health: 'healthy',
      needsUpdate: false,
      newerVersion: false,
      invalidApiKeyId: 'key-1',
    });
    await second.run();
    expect(second.logger.warn).not.toHaveBeenCalled();
    // So the key isn't authenticated with again.
    const [, , { getAutoUpdateState }] = jest.mocked(getApiKeyStatus).mock.calls[1];
    expect(await getAutoUpdateState?.()).toEqual({ invalidApiKeyId: 'key-1' });
  });

  it('moves transforms left on another sessions key to the stored one', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue({ ...healthyStatus, autoUpdate: true });
    jest.mocked(updateSessionsWithApiKey).mockResolvedValue(true);
    const { logger, run } = setup();

    await run();

    expect(updateSessionsWithApiKey).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Moved the sessions transforms to their stored API key.'
    );
  });

  it('logs nothing when the stored key has nothing to update', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue({ ...healthyStatus, autoUpdate: true });
    jest.mocked(updateSessionsWithApiKey).mockResolvedValue(false);
    const { logger, run } = setup();

    await run();

    expect(getSessionsStatus).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs a problem once, not on every run while it lasts', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue({ ...healthyStatus, health: 'lagging' });
    const { logger, run } = setup({ health: 'lagging', needsUpdate: false, newerVersion: false });

    await run();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs when the transforms recover', async () => {
    jest.mocked(getSessionsStatus).mockResolvedValue(healthyStatus);
    const { logger, run } = setup({ health: 'degraded', needsUpdate: false, newerVersion: false });

    expect(await run()).toEqual({
      state: { health: 'healthy', needsUpdate: false, newerVersion: false },
    });
    expect(logger.info).toHaveBeenCalledWith('Sessions transforms are no longer degraded.');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns once that a newer Kibana set sessions up', async () => {
    const newer: SessionsStatus = {
      ...healthyStatus,
      installedVersion: 2,
      reason: 'Sessions transforms are from version 2, newer than this Kibana supports.',
    };
    jest.mocked(getSessionsStatus).mockResolvedValue(newer);
    const first = setup();

    expect(await first.run()).toEqual({
      state: { health: 'healthy', needsUpdate: false, newerVersion: true },
    });
    expect(first.logger.warn).toHaveBeenCalledWith(newer.reason);

    const second = setup({ health: 'healthy', needsUpdate: false, newerVersion: true });
    await second.run();
    expect(second.logger.warn).not.toHaveBeenCalled();
  });

  it('never creates, updates or starts a transform with the internal user', async () => {
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

describe('getLastAutoUpdateState', () => {
  const logger = loggingSystemMock.createLogger();

  it("reads what the last run found about automatic updates from the task's state", async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({
      state: {
        health: 'outdated',
        autoUpdateError: 'unable to authenticate',
        invalidApiKeyId: 'key-1',
      },
    } as never);

    expect(await getLastAutoUpdateState(taskManager, logger)).toEqual({
      autoUpdateError: 'unable to authenticate',
      invalidApiKeyId: 'key-1',
    });
    expect(taskManager.get).toHaveBeenCalledWith(SESSIONS_HEALTH_TASK_ID);
  });

  it('has nothing before the task is scheduled', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', SESSIONS_HEALTH_TASK_ID)
    );

    expect(await getLastAutoUpdateState(taskManager, logger)).toEqual({});
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs, and has nothing, when the task can't be read", async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('no shards available'));

    expect(await getLastAutoUpdateState(taskManager, logger)).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no shards available'));
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
