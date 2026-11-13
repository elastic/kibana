/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  SESSIONS_LOOKBACK_DAYS,
  SESSIONS_TASK_ID,
  SESSIONS_VERSION,
  type SessionsStatus,
} from '../../../common/sessions';
import { RUN_FAILED_MESSAGE, getSessionsStatus } from './sessions_status';
import type { SessionsTaskState } from './sessions_task';

type TaskUserScope = NonNullable<ConcreteTaskInstance['userScope']>;

const NOW = Date.parse('2026-11-10T12:00:00.000Z');
const settings = { frequency: '1m', concurrency: 2 };
const secondsAgo = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

const userScope: TaskUserScope = {
  apiKeyId: 'key-1',
  apiKeyCreatedByUser: false,
  userName: 'ana',
};

/** Caught up, current, and 90 seconds behind: within the lag threshold of a 1m frequency. */
const healthyState: SessionsTaskState = {
  version: SESSIONS_VERSION,
  checkpoint: secondsAgo(90),
  windowMs: 60 * 60 * 1000,
  caughtUp: true,
  lastRunAt: secondsAgo(30),
  lastSuccessAt: secondsAgo(30),
  lastError: null,
  apiKeyInvalid: false,
  lastRetentionAt: secondsAgo(600),
};

const MISSING: SessionsStatus = {
  installed: false,
  health: 'missing',
  installedVersion: null,
  currentVersion: SESSIONS_VERSION,
  rebuilding: false,
  apiKeyInvalid: false,
  reason: null,
  lagSeconds: null,
  summarizedUntil: null,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  enabledBy: null,
  retentionDays: SESSIONS_LOOKBACK_DAYS,
};

describe('getSessionsStatus', () => {
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;

  const mockTask = (state: SessionsTaskState, overrides: Partial<ConcreteTaskInstance> = {}) =>
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({ id: SESSIONS_TASK_ID, state, userScope, ...overrides })
    );

  /** The status as a user who can set sessions up reads it, with the details. */
  const statusOf = (
    state: SessionsTaskState,
    { frequency, withDetails = true }: { frequency?: string; withDetails?: boolean } = {}
  ) => {
    mockTask(state);
    return getSessionsStatus({
      taskManager,
      settings: { ...settings, ...(frequency ? { frequency } : {}) },
      withDetails,
      now: NOW,
    });
  };

  beforeEach(() => {
    taskManager = taskManagerMock.createStart();
  });

  describe('missing', () => {
    it('is missing without Task Manager, which builds the sessions', async () => {
      expect(await getSessionsStatus({ taskManager: undefined, settings, now: NOW })).toEqual(
        MISSING
      );
    });

    it('is missing until the summaries task is scheduled', async () => {
      taskManager.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('task', SESSIONS_TASK_ID)
      );

      expect(await getSessionsStatus({ taskManager, settings, now: NOW })).toEqual(MISSING);
      expect(taskManager.get).toHaveBeenCalledWith(SESSIONS_TASK_ID);
    });

    it('rethrows other errors reading the task', async () => {
      taskManager.get.mockRejectedValue(new Error('no shards available'));

      await expect(getSessionsStatus({ taskManager, settings, now: NOW })).rejects.toThrow(
        'no shards available'
      );
    });
  });

  it('reports healthy, caught-up summaries and who enabled them', async () => {
    expect(await statusOf(healthyState)).toEqual({
      installed: true,
      health: 'healthy',
      installedVersion: SESSIONS_VERSION,
      currentVersion: SESSIONS_VERSION,
      rebuilding: false,
      apiKeyInvalid: false,
      reason: null,
      lagSeconds: 90,
      summarizedUntil: healthyState.checkpoint,
      lastRunAt: healthyState.lastRunAt,
      lastSuccessAt: healthyState.lastSuccessAt,
      lastError: null,
      enabledBy: 'ana',
      retentionDays: SESSIONS_LOOKBACK_DAYS,
    });
  });

  it('reports a task that has not run yet as rebuilding, with no lag', async () => {
    expect(await statusOf({})).toEqual(
      expect.objectContaining({
        installed: true,
        health: 'healthy',
        installedVersion: null,
        rebuilding: true,
        lagSeconds: null,
        summarizedUntil: null,
        lastRunAt: null,
        lastSuccessAt: null,
      })
    );
  });

  describe('rebuilding', () => {
    it.each([
      ['has not caught up yet', { ...healthyState, caughtUp: false }],
      ['wrote another version', { ...healthyState, version: SESSIONS_VERSION - 1 }],
    ])('is rebuilding while the task %s', async (_name, state) => {
      expect((await statusOf(state)).rebuilding).toBe(true);
    });

    it('is not lagging while rebuilding, however far behind', async () => {
      const status = await statusOf({
        ...healthyState,
        caughtUp: false,
        checkpoint: secondsAgo(10 * 24 * 60 * 60),
      });

      expect(status).toEqual(
        expect.objectContaining({ health: 'healthy', rebuilding: true, lagSeconds: 864_000 })
      );
    });
  });

  describe('lag', () => {
    it('is the time since the checkpoint, never below zero', async () => {
      expect((await statusOf({ ...healthyState, checkpoint: secondsAgo(-30) })).lagSeconds).toBe(0);
    });

    it('lags past three missed runs and the sync delay, and at least five minutes', async () => {
      // A 1m frequency lags past 300s.
      expect((await statusOf({ ...healthyState, checkpoint: secondsAgo(300) })).health).toBe(
        'healthy'
      );
      const status = await statusOf({ ...healthyState, checkpoint: secondsAgo(15 * 60) });
      expect(status).toEqual(
        expect.objectContaining({
          health: 'lagging',
          lagSeconds: 900,
          reason: 'Session summaries are 15 minutes behind the events.',
        })
      );
    });

    it('allows more lag for a longer frequency', async () => {
      // A 5m frequency lags past 3 * 300 + 60 = 960s.
      expect(
        (await statusOf({ ...healthyState, checkpoint: secondsAgo(900) }, { frequency: '5m' }))
          .health
      ).toBe('healthy');
      expect(
        (await statusOf({ ...healthyState, checkpoint: secondsAgo(961) }, { frequency: '5m' }))
          .health
      ).toBe('lagging');
    });
  });

  describe('degraded', () => {
    it('is degraded when Elasticsearch rejected the API key', async () => {
      const status = await statusOf({ ...healthyState, apiKeyInvalid: true });

      expect(status).toEqual(
        expect.objectContaining({ health: 'degraded', apiKeyInvalid: true, enabledBy: 'ana' })
      );
      expect(status.reason).toContain('must enable sessions again');
    });

    it('is degraded when the rejected key is the one the task has', async () => {
      const status = await statusOf({
        ...healthyState,
        apiKeyInvalid: true,
        failedApiKeyId: 'key-1',
        lastError: { message: 'security_exception', at: secondsAgo(30) },
      });

      expect(status).toEqual(expect.objectContaining({ health: 'degraded', apiKeyInvalid: true }));
    });

    it('is not degraded by a key that enabling sessions again has replaced', async () => {
      const status = await statusOf({
        ...healthyState,
        apiKeyInvalid: true,
        failedApiKeyId: 'key-0',
        lastError: { message: 'security_exception', at: secondsAgo(30) },
      });

      expect(status).toEqual(
        expect.objectContaining({ health: 'healthy', apiKeyInvalid: false, lastError: null })
      );
    });

    it('is degraded when the task has no API key', async () => {
      mockTask(healthyState, { userScope: undefined });

      const status = await getSessionsStatus({
        taskManager,
        settings,
        withDetails: true,
        now: NOW,
      });

      expect(status).toEqual(
        expect.objectContaining({ health: 'degraded', apiKeyInvalid: true, enabledBy: null })
      );
    });

    it('is degraded with the error of the last run', async () => {
      const lastError = { message: 'esql timed out', at: secondsAgo(30) };

      expect(await statusOf({ ...healthyState, lastError })).toEqual(
        expect.objectContaining({
          health: 'degraded',
          reason: 'The last run failed: esql timed out',
          lastError,
        })
      );
    });

    it('explains an invalid API key before the error it caused, and before lag', async () => {
      const status = await statusOf({
        ...healthyState,
        apiKeyInvalid: true,
        lastError: { message: 'security_exception', at: secondsAgo(30) },
        checkpoint: secondsAgo(60 * 60),
      });

      expect(status.health).toBe('degraded');
      expect(status.reason).toContain('API key');
      expect(status.reason).not.toContain('security_exception');
    });

    it('reports a failing run before lag', async () => {
      const status = await statusOf({
        ...healthyState,
        lastError: { message: 'esql timed out', at: secondsAgo(30) },
        checkpoint: secondsAgo(60 * 60),
      });

      expect(status).toEqual(expect.objectContaining({ health: 'degraded', lagSeconds: 3600 }));
    });
  });

  describe('without the details, for users who cannot set sessions up', () => {
    it('hides who enabled sessions', async () => {
      expect((await statusOf(healthyState, { withDetails: false })).enabledBy).toBeNull();
    });

    it('says the last run failed, but not why', async () => {
      const at = secondsAgo(30);
      const status = await statusOf(
        {
          ...healthyState,
          lastError: { message: 'security_exception: action denied for user [ana]', at },
        },
        { withDetails: false }
      );

      expect(status).toEqual(
        expect.objectContaining({
          health: 'degraded',
          reason: RUN_FAILED_MESSAGE,
          lastError: { message: RUN_FAILED_MESSAGE, at },
        })
      );
      expect(JSON.stringify(status)).not.toContain('ana');
    });
  });
});
