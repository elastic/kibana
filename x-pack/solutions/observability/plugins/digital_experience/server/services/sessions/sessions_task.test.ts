/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { TaskCost, type TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SESSIONS_TASK_ID, SESSIONS_TASK_TYPE, SESSIONS_VERSION } from '../../../common/sessions';
import {
  createSessionsIndex,
  deleteExpiredSessions,
  deleteOlderSessionsIndices,
  putSessionsIndexTemplate,
} from './sessions_index';
import {
  NO_API_KEY_MESSAGE,
  apiKeyIdOf,
  registerSessionsTask,
  withConfiguredInterval,
  runSessionsTask,
  scheduleSessionsTask,
  type RunSessionsTaskParams,
  type SessionsTaskState,
} from './sessions_task';
import { INITIAL_WINDOW_MS, summarizeSessions } from './summarize_sessions';

jest.mock('./sessions_index');
jest.mock('./summarize_sessions');

const NOW = Date.parse('2026-11-10T12:00:00.000Z');
const AT = new Date(NOW).toISOString();
const MINUTE_MS = 60 * 1000;
const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE_MS).toISOString();

/** A task that caught up on its last run, a minute ago. */
const caughtUpState: SessionsTaskState = {
  version: SESSIONS_VERSION,
  checkpoint: minutesAgo(2),
  windowMs: 2 * INITIAL_WINDOW_MS,
  caughtUp: true,
  lastRunAt: minutesAgo(1),
  lastSuccessAt: minutesAgo(1),
  lastError: null,
  apiKeyInvalid: false,
  lastRetentionAt: minutesAgo(10),
};

const summarized = {
  checkpoint: minutesAgo(1),
  windowMs: 4 * INITIAL_WINDOW_MS,
  caughtUp: true,
  sessions: 12,
};

const esError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'security_exception' } },
    headers: {},
    warnings: null,
    meta: {} as never,
  });

describe('runSessionsTask', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let internalClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const { signal } = new AbortController();

  const run = (state: SessionsTaskState, overrides: Partial<RunSessionsTaskParams> = {}) =>
    runSessionsTask({
      state,
      esClient,
      apiKeyId: 'key-1',
      internalClient,
      signal,
      logger,
      now: NOW,
      concurrency: 2,
      ...overrides,
    });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    internalClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    jest.mocked(createSessionsIndex).mockResolvedValue(false);
    jest.mocked(deleteOlderSessionsIndices).mockResolvedValue([]);
    jest.mocked(deleteExpiredSessions).mockResolvedValue(0);
    jest.mocked(summarizeSessions).mockResolvedValue(summarized);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('without an API key', () => {
    it('reads nothing and keeps the error in the state', async () => {
      expect(await run(caughtUpState, { esClient: undefined })).toEqual({
        state: {
          ...caughtUpState,
          lastRunAt: AT,
          lastError: { message: NO_API_KEY_MESSAGE, at: AT },
        },
      });
      expect(summarizeSessions).not.toHaveBeenCalled();
      expect(putSessionsIndexTemplate).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(NO_API_KEY_MESSAGE));
    });

    it('logs it only once', async () => {
      await run(
        { ...caughtUpState, lastError: { message: NO_API_KEY_MESSAGE, at: minutesAgo(1) } },
        { esClient: undefined }
      );

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('the first run, or a new version', () => {
    it.each([
      ['the first run', {}],
      ['a new version', { ...caughtUpState, version: SESSIONS_VERSION - 1 }],
    ])(
      'puts the template, replaces the older versions and starts from the lookback on %s',
      async (_name, state) => {
        const result = await run(state);

        expect(putSessionsIndexTemplate).toHaveBeenCalledWith(internalClient, signal);
        expect(createSessionsIndex).toHaveBeenCalledWith(esClient, signal);
        expect(deleteOlderSessionsIndices).toHaveBeenCalledWith(esClient, signal);
        expect(summarizeSessions).toHaveBeenCalledWith({
          esClient,
          signal,
          now: NOW,
          checkpoint: null,
          windowMs: INITIAL_WINDOW_MS,
          budgetMs: 45_000,
          concurrency: 2,
        });
        expect(result.state).toEqual(expect.objectContaining({ version: SESSIONS_VERSION }));
      }
    );

    it('creates the index of this version before deleting the older ones', async () => {
      await run({});

      const [create] = jest.mocked(createSessionsIndex).mock.invocationCallOrder;
      const [deleteOlder] = jest.mocked(deleteOlderSessionsIndices).mock.invocationCallOrder;
      expect(create).toBeLessThan(deleteOlder);
    });

    it('is not caught up until a run of the new version is', async () => {
      jest.mocked(summarizeSessions).mockResolvedValue({ ...summarized, caughtUp: false });

      const { state } = await run({ ...caughtUpState, version: SESSIONS_VERSION - 1 });

      expect(state.caughtUp).toBe(false);
    });
  });

  describe('a run of the current version', () => {
    it('carries on from the checkpoint with the last window size', async () => {
      const result = await run(caughtUpState);

      expect(putSessionsIndexTemplate).not.toHaveBeenCalled();
      expect(deleteOlderSessionsIndices).not.toHaveBeenCalled();
      expect(createSessionsIndex).toHaveBeenCalledWith(esClient, signal);
      expect(summarizeSessions).toHaveBeenCalledWith(
        expect.objectContaining({
          checkpoint: caughtUpState.checkpoint,
          windowMs: caughtUpState.windowMs,
        })
      );
      expect(result).toEqual({
        state: {
          version: SESSIONS_VERSION,
          checkpoint: summarized.checkpoint,
          windowMs: summarized.windowMs,
          caughtUp: true,
          lastRunAt: AT,
          lastSuccessAt: AT,
          lastError: null,
          apiKeyInvalid: false,
          failedApiKeyId: null,
          lastRetentionAt: caughtUpState.lastRetentionAt,
        },
      });
    });

    it('rebuilds from the lookback when the index was deleted', async () => {
      jest.mocked(createSessionsIndex).mockResolvedValue(true);
      jest.mocked(summarizeSessions).mockResolvedValue({ ...summarized, caughtUp: false });

      const { state } = await run(caughtUpState);

      expect(summarizeSessions).toHaveBeenCalledWith(
        expect.objectContaining({ checkpoint: null, windowMs: INITIAL_WINDOW_MS })
      );
      expect(state.caughtUp).toBe(false);
      // Only a new version replaces the template and the older indices.
      expect(putSessionsIndexTemplate).not.toHaveBeenCalled();
      expect(deleteOlderSessionsIndices).not.toHaveBeenCalled();
    });

    it('stays caught up when one run falls behind, and runs again right away', async () => {
      jest.mocked(summarizeSessions).mockResolvedValue({ ...summarized, caughtUp: false });

      const result = await run(caughtUpState);

      expect(result.state.caughtUp).toBe(true);
      expect(result.runAt).toEqual(expect.any(Date));
    });

    it('waits for the interval once it has caught up', async () => {
      expect(await run(caughtUpState)).not.toHaveProperty('runAt');
    });

    it('logs when the summaries first catch up', async () => {
      await run({ ...caughtUpState, caughtUp: false });
      expect(logger.info).toHaveBeenCalledWith(
        'Digital Experience session summaries caught up with the events.'
      );

      logger.info.mockClear();
      await run(caughtUpState);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('starts from the lookback with the first window when the state has no checkpoint', async () => {
      await run({ version: SESSIONS_VERSION });

      expect(summarizeSessions).toHaveBeenCalledWith(
        expect.objectContaining({ checkpoint: null, windowMs: INITIAL_WINDOW_MS })
      );
    });
  });

  describe('retention', () => {
    it.each([
      ['never ran', undefined],
      ['last ran an hour ago', minutesAgo(60)],
    ])('deletes the expired sessions when it %s', async (_name, lastRetentionAt) => {
      const { state } = await run({ ...caughtUpState, lastRetentionAt });

      expect(deleteExpiredSessions).toHaveBeenCalledWith(esClient, NOW, signal);
      expect(state.lastRetentionAt).toBe(AT);
    });

    it('runs at most hourly', async () => {
      const { state } = await run({ ...caughtUpState, lastRetentionAt: minutesAgo(59) });

      expect(deleteExpiredSessions).not.toHaveBeenCalled();
      expect(state.lastRetentionAt).toBe(minutesAgo(59));
    });

    it('deletes after the summaries are written', async () => {
      await run({ ...caughtUpState, lastRetentionAt: undefined });

      const [summarize] = jest.mocked(summarizeSessions).mock.invocationCallOrder;
      const [expire] = jest.mocked(deleteExpiredSessions).mock.invocationCallOrder;
      expect(summarize).toBeLessThan(expire);
    });

    // Keeping it in the state would send the next run back to the start of the lookback.
    it('keeps the checkpoint and only logs when deleting fails', async () => {
      jest.mocked(deleteExpiredSessions).mockRejectedValue(new Error('search_phase_execution'));

      const { state } = await run({ ...caughtUpState, lastRetentionAt: undefined });

      expect(state).toMatchObject({
        version: SESSIONS_VERSION,
        checkpoint: summarized.checkpoint,
        caughtUp: true,
        lastSuccessAt: AT,
        lastError: null,
        // Waits for the interval rather than retrying on every run.
        lastRetentionAt: AT,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Deleting the expired Digital Experience session summaries failed: search_phase_execution'
      );
    });

    it('does not delete after a failed run, which has nothing to keep it from', async () => {
      jest.mocked(summarizeSessions).mockRejectedValue(new Error('esql timed out'));

      const { state } = await run({ ...caughtUpState, lastRetentionAt: undefined });

      expect(deleteExpiredSessions).not.toHaveBeenCalled();
      expect(state.lastRetentionAt).toBeUndefined();
    });
  });

  describe('failures', () => {
    it('keeps the previous state and the error, so the next run retries from the checkpoint', async () => {
      jest.mocked(summarizeSessions).mockRejectedValue(new Error('esql timed out'));

      expect(await run(caughtUpState)).toEqual({
        state: {
          ...caughtUpState,
          lastRunAt: AT,
          lastError: { message: 'esql timed out', at: AT },
          apiKeyInvalid: false,
          failedApiKeyId: null,
        },
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Summarizing Digital Experience sessions failed: esql timed out'
      );
    });

    it('starts the rebuild over when the run that recreated the index fails', async () => {
      jest.mocked(createSessionsIndex).mockResolvedValue(true);
      jest.mocked(summarizeSessions).mockRejectedValue(new Error('esql timed out'));

      const { state } = await run(caughtUpState);

      expect(state).toMatchObject({
        checkpoint: null,
        caughtUp: false,
        windowMs: INITIAL_WINDOW_MS,
        lastError: { message: 'esql timed out', at: AT },
      });
    });

    it('starts the rebuild over when a run of a new version fails', async () => {
      jest.mocked(summarizeSessions).mockRejectedValue(new Error('esql timed out'));

      const { state } = await run({ ...caughtUpState, version: SESSIONS_VERSION - 1 });

      expect(state).toMatchObject({
        version: SESSIONS_VERSION - 1,
        checkpoint: null,
        caughtUp: false,
      });
    });

    it('stops at a failed step', async () => {
      jest.mocked(createSessionsIndex).mockRejectedValue(new Error('cluster_block_exception'));

      const { state } = await run(caughtUpState);

      expect(summarizeSessions).not.toHaveBeenCalled();
      expect(deleteExpiredSessions).not.toHaveBeenCalled();
      expect(state.lastError?.message).toBe('cluster_block_exception');
    });

    it('marks the API key invalid when Elasticsearch rejects it, with its id', async () => {
      jest.mocked(summarizeSessions).mockRejectedValue(esError(401));

      const { state } = await run(caughtUpState);

      expect(state).toMatchObject({ apiKeyInvalid: true, failedApiKeyId: 'key-1' });
    });

    it('marks it invalid without an id when the request does not tell it', async () => {
      jest.mocked(summarizeSessions).mockRejectedValue(esError(401));

      const { state } = await run(caughtUpState, { apiKeyId: null });

      expect(state).toMatchObject({ apiKeyInvalid: true, failedApiKeyId: null });
    });

    it.each([
      ['a 403', esError(403)],
      ['another error', new Error('401 in a message')],
    ])('does not mark the API key invalid for %s', async (_name, error) => {
      jest.mocked(summarizeSessions).mockRejectedValue(error);

      expect((await run({ ...caughtUpState, apiKeyInvalid: true })).state.apiKeyInvalid).toBe(
        false
      );
    });

    it('logs an error only when it changes', async () => {
      jest.mocked(summarizeSessions).mockRejectedValue(new Error('esql timed out'));
      const failing = {
        ...caughtUpState,
        lastError: { message: 'esql timed out', at: minutesAgo(1) },
      };

      await run(failing);
      expect(logger.warn).not.toHaveBeenCalled();

      jest.mocked(summarizeSessions).mockRejectedValue(new Error('no shards available'));
      await run(failing);
      expect(logger.warn).toHaveBeenCalledWith(
        'Summarizing Digital Experience sessions failed: no shards available'
      );
    });

    it('clears the error and logs when a run succeeds again', async () => {
      const { state } = await run({
        ...caughtUpState,
        lastError: { message: 'esql timed out', at: minutesAgo(1) },
        apiKeyInvalid: true,
      });

      expect(state).toEqual(expect.objectContaining({ lastError: null, apiKeyInvalid: false }));
      expect(logger.info).toHaveBeenCalledWith(
        'Summarizing Digital Experience sessions works again.'
      );
    });
  });
});

describe('registerSessionsTask', () => {
  const setup = () => {
    const core = coreMock.createSetup();
    const logger = loggingSystemMock.createLogger();
    const taskManager = taskManagerMock.createSetup();
    registerSessionsTask({
      core,
      logger,
      taskManager,
      settings: { frequency: '1m', concurrency: 3 },
    });
    const definitions: TaskDefinitionRegistry =
      taskManager.registerTaskDefinitions.mock.calls[0][0];
    return { core, definition: definitions[SESSIONS_TASK_TYPE] };
  };

  beforeEach(() => {
    jest.mocked(createSessionsIndex).mockResolvedValue(false);
    jest.mocked(summarizeSessions).mockResolvedValue(summarized);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('registers a task that a stuck query cannot hold for long', () => {
    const { definition } = setup();

    expect(definition).toEqual(expect.objectContaining({ timeout: '5m', cost: TaskCost.Normal }));
    expect(Object.keys(definition.stateSchemaByVersion ?? {})).toEqual(['1']);
  });

  it('validates the state of version 1 and keeps it as it is', () => {
    const { definition } = setup();
    const version1 = definition.stateSchemaByVersion?.[1];

    expect(version1?.schema.validate(caughtUpState)).toEqual(caughtUpState);
    expect(version1?.schema.validate({})).toEqual({});
    expect(() => version1?.schema.validate({ caughtUp: 'yes' })).toThrow();
    expect(version1?.up(caughtUpState)).toBe(caughtUpState);
  });

  it('runs with the API key of the user who enabled sessions, and the internal user for the template', async () => {
    const { core, definition } = setup();
    const [coreStart] = await core.getStartServices();
    const { client } = coreStart.elasticsearch;
    const fakeRequest = httpServerMock.createKibanaRequest();
    const { signal } = new AbortController();

    const result = await definition
      .createTaskRunner(
        taskManagerMock.createRunContext({
          taskInstance: taskManagerMock.createTask({ state: {}, schedule: { interval: '1m' } }),
          fakeRequest,
          signal,
        })
      )
      .run();

    expect(client.asScoped).toHaveBeenCalledWith(fakeRequest);
    const scopedClient = jest.mocked(client.asScoped).mock.results[0].value.asCurrentUser;
    expect(putSessionsIndexTemplate).toHaveBeenCalledWith(client.asInternalUser, signal);
    expect(summarizeSessions).toHaveBeenCalledWith(
      expect.objectContaining({ esClient: scopedClient, signal, concurrency: 3 })
    );
    expect(result).toEqual({
      state: expect.objectContaining({ version: SESSIONS_VERSION, lastError: null }),
    });
  });

  it('reads nothing without an API key', async () => {
    const { core, definition } = setup();
    const [coreStart] = await core.getStartServices();

    const result = await definition
      .createTaskRunner(
        taskManagerMock.createRunContext({
          taskInstance: taskManagerMock.createTask({
            state: caughtUpState,
            schedule: { interval: '1m' },
          }),
        })
      )
      .run();

    expect(coreStart.elasticsearch.client.asScoped).not.toHaveBeenCalled();
    expect(summarizeSessions).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: expect.objectContaining({
        checkpoint: caughtUpState.checkpoint,
        lastError: expect.objectContaining({ message: NO_API_KEY_MESSAGE }),
      }),
    });
  });
});

describe('withConfiguredInterval', () => {
  const result = { state: { caughtUp: true } };

  it('keeps the run result when the task has the configured interval', () => {
    expect(withConfiguredInterval(result, '1m', '1m')).toBe(result);
  });

  it('applies a changed interval from the next run', () => {
    expect(withConfiguredInterval(result, '1m', '5m')).toEqual({
      state: result.state,
      schedule: { interval: '5m' },
    });
  });

  it('runs again right away first, while the task is behind', () => {
    const behind = { ...result, runAt: new Date() };

    expect(withConfiguredInterval(behind, '1m', '5m')).toBe(behind);
  });
});

describe('scheduleSessionsTask', () => {
  it('schedules the task with a new API key of the requesting user, at the configured interval', async () => {
    const taskManager = taskManagerMock.createStart();
    const request = httpServerMock.createKibanaRequest();

    await scheduleSessionsTask({ taskManager, request, settings: { frequency: '5m' } });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      {
        id: SESSIONS_TASK_ID,
        taskType: SESSIONS_TASK_TYPE,
        schedule: { interval: '5m' },
        params: {},
        state: {},
      },
      { request, regenerateApiKey: true, includeRunningTasks: true }
    );
  });

  it('fails when Task Manager cannot schedule it', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.ensureScheduled.mockRejectedValue(new Error('unable to grant an API key'));

    await expect(
      scheduleSessionsTask({
        taskManager,
        request: httpServerMock.createKibanaRequest(),
        settings: { frequency: '1m' },
      })
    ).rejects.toThrow('unable to grant an API key');
  });
});

describe('apiKeyIdOf', () => {
  const requestWith = (authorization?: string) =>
    httpServerMock.createKibanaRequest({ headers: authorization ? { authorization } : {} });
  const apiKey = (value: string) => `ApiKey ${Buffer.from(value).toString('base64')}`;

  it('reads the id of an Elasticsearch API key', () => {
    expect(apiKeyIdOf(requestWith(apiKey('VuaCfGcBCdbkQm-e5aOx:ui2lp2axTNmsyakw9tvNnw')))).toBe(
      'VuaCfGcBCdbkQm-e5aOx'
    );
  });

  it.each([
    ['no credentials', undefined],
    ['basic credentials', `Basic ${Buffer.from('elastic:changeme').toString('base64')}`],
    ['a key that is not base64 of an id and a secret', 'ApiKey essu_dGhpcyBpcyBub3Q'],
  ])('has no id for %s', (_name, authorization) => {
    expect(apiKeyIdOf(requestWith(authorization))).toBeNull();
  });
});
