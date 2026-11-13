/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { CoreSetup, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  SESSIONS_TASK_ID,
  SESSIONS_TASK_TYPE,
  SESSIONS_VERSION,
  type SessionsSettings,
} from '../../../common/sessions';
import { describeError } from '../../lib/helpers/errors';
import { createSessionsIndex, putSessionsIndexTemplate } from './sessions_index';
import { INITIAL_WINDOW_MS, summarizeSessions } from './summarize_sessions';

/** No window starts after this much of a run, so it ends well before its timeout. */
const RUN_BUDGET_MS = 45 * 1000;

export const NO_API_KEY_MESSAGE =
  'The task has no API key, so it cannot read events. Enable sessions again to grant one.';

const stateSchemaV1 = schema.object({
  /** Version of the summaries the checkpoint is for; another version rebuilds them all. */
  version: schema.maybe(schema.number()),
  /** Every event before it is summarized. */
  checkpoint: schema.maybe(schema.nullable(schema.string())),
  /** Size of the next window of events, which grows and shrinks with the sessions in it. */
  windowMs: schema.maybe(schema.number()),
  /** True once the summaries reached the sync delay since the last rebuild began. */
  caughtUp: schema.maybe(schema.boolean()),
  lastRunAt: schema.maybe(schema.nullable(schema.string())),
  lastSuccessAt: schema.maybe(schema.nullable(schema.string())),
  lastError: schema.maybe(
    schema.nullable(schema.object({ message: schema.string(), at: schema.string() }))
  ),
  /** True when Elasticsearch rejected the task's API key, so it was invalidated or expired. */
  apiKeyInvalid: schema.maybe(schema.boolean()),
  /**
   * The id of the key Elasticsearch rejected, when the request tells it, so a key granted since
   * by enabling sessions again isn't taken for invalid while a run of the old one finishes.
   */
  failedApiKeyId: schema.maybe(schema.nullable(schema.string())),
});

export type SessionsTaskState = TypeOf<typeof stateSchemaV1>;

/** The sessions settings the task runs with. */
export interface SessionsTaskSettings extends SessionsSettings {
  /** Summary queries run at once. */
  concurrency: number;
}

export interface RunSessionsTaskParams {
  state: SessionsTaskState;
  /** The task's API key, or `undefined` when it has none. */
  esClient: ElasticsearchClient | undefined;
  /** The id of that key, when its request tells it. */
  apiKeyId: string | null;
  internalClient: ElasticsearchClient;
  signal: AbortSignal;
  logger: Logger;
  now: number;
  concurrency: number;
}

const API_KEY_ID = /^[\w-]{1,128}$/;

/**
 * The id of the Elasticsearch API key a task's request authenticates with: Task Manager sends it
 * as `ApiKey base64(id:key)`. `null` for any other credential, such as a UIAM key.
 */
export const apiKeyIdOf = (request: KibanaRequest): string | null => {
  const { authorization } = request.headers;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  const [scheme, encoded] = header?.split(' ') ?? [];
  if (scheme !== 'ApiKey' || !encoded) {
    return null;
  }
  const [id] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
  return API_KEY_ID.test(id) ? id : null;
};

const logErrorChange = (logger: Logger, previous: SessionsTaskState, message: string) => {
  if (previous.lastError?.message !== message) {
    logger.warn(`Summarizing Digital Experience sessions failed: ${message}`);
  }
};

/**
 * One run: summarizes the sessions with new events, window by window, and runs again right away
 * while it hasn't caught up. Failures are kept in the state rather than thrown, so the next run
 * retries from the same checkpoint and the status shows them.
 */
export const runSessionsTask = async ({
  state,
  esClient,
  apiKeyId,
  internalClient,
  signal,
  logger,
  now,
  concurrency,
}: RunSessionsTaskParams): Promise<{ state: SessionsTaskState; runAt?: Date }> => {
  const at = new Date(now).toISOString();
  if (!esClient) {
    logErrorChange(logger, state, NO_API_KEY_MESSAGE);
    return {
      state: { ...state, lastRunAt: at, lastError: { message: NO_API_KEY_MESSAGE, at } },
    };
  }

  // A deleted index, or a new version, is rebuilt from the lookback, also after a failed run.
  let rebuild = state.version !== SESSIONS_VERSION;
  try {
    if (rebuild) {
      await putSessionsIndexTemplate(internalClient, signal);
    }
    const created = await createSessionsIndex(esClient, signal);
    rebuild = rebuild || created;
    const result = await summarizeSessions({
      esClient,
      signal,
      now,
      checkpoint: rebuild ? null : state.checkpoint ?? null,
      windowMs: rebuild ? INITIAL_WINDOW_MS : state.windowMs ?? INITIAL_WINDOW_MS,
      budgetMs: RUN_BUDGET_MS,
      concurrency,
    });

    const caughtUp = (!rebuild && state.caughtUp === true) || result.caughtUp;
    if (caughtUp && state.caughtUp !== true) {
      logger.info('Digital Experience session summaries caught up with the events.');
    }
    if (state.lastError) {
      logger.info('Summarizing Digital Experience sessions works again.');
    }
    return {
      state: {
        version: SESSIONS_VERSION,
        checkpoint: result.checkpoint,
        windowMs: result.windowMs,
        caughtUp,
        lastRunAt: at,
        lastSuccessAt: at,
        lastError: null,
        apiKeyInvalid: false,
        failedApiKeyId: null,
      },
      // Behind: run again right away instead of waiting for the interval.
      ...(result.caughtUp ? {} : { runAt: new Date() }),
    };
  } catch (error) {
    const message = describeError(error);
    const unauthorized = isResponseError(error) && error.statusCode === 401;
    logErrorChange(logger, state, message);
    return {
      state: {
        ...state,
        // A rebuild that failed starts over: the next run finds the index it created.
        ...(rebuild ? { checkpoint: null, caughtUp: false, windowMs: INITIAL_WINDOW_MS } : {}),
        lastRunAt: at,
        lastError: { message, at },
        apiKeyInvalid: unauthorized,
        failedApiKeyId: unauthorized ? apiKeyId : null,
      },
    };
  }
};

/**
 * The run's result, with the configured interval when it differs from the task's: a changed
 * `frequency` then applies from the next run. Not while the task runs again right away.
 */
export const withConfiguredInterval = (
  result: { state: SessionsTaskState; runAt?: Date },
  scheduledInterval: string | undefined,
  frequency: string
) =>
  result.runAt || scheduledInterval === frequency
    ? result
    : { state: result.state, schedule: { interval: frequency } };

/**
 * Registers the task that builds the session summaries with ES|QL. It runs with the API key Task
 * Manager granted on behalf of the user who enabled sessions, never as the internal user, so it
 * only summarizes what that user can read. Only the index template is the internal user's.
 */
export const registerSessionsTask = ({
  core,
  logger,
  taskManager,
  settings,
}: {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  settings: SessionsTaskSettings;
}): void => {
  taskManager.registerTaskDefinitions({
    [SESSIONS_TASK_TYPE]: {
      title: 'Digital Experience session summaries',
      description:
        'Summarizes the RUM sessions with new events into the Digital Experience sessions index.',
      // A run starts no window after 45s; this only stops one stuck on a query.
      timeout: '5m',
      cost: TaskCost.Normal,
      stateSchemaByVersion: { 1: { schema: stateSchemaV1, up: (state) => state } },
      createTaskRunner: ({ taskInstance, signal, fakeRequest }) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const result = await runSessionsTask({
            state: taskInstance.state,
            esClient: fakeRequest
              ? coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser
              : undefined,
            apiKeyId: fakeRequest ? apiKeyIdOf(fakeRequest) : null,
            internalClient: coreStart.elasticsearch.client.asInternalUser,
            signal,
            logger,
            now: Date.now(),
            concurrency: settings.concurrency,
          });
          return withConfiguredInterval(
            result,
            taskInstance.schedule?.interval,
            settings.frequency
          );
        },
      }),
    },
  });
};

/**
 * Schedules the task with an API key granted on behalf of `request`'s user, or gives an existing
 * task a new key, which keeps its state and so its checkpoint. The previous key is invalidated.
 */
export const scheduleSessionsTask = async ({
  taskManager,
  request,
  settings,
}: {
  taskManager: TaskManagerStartContract;
  request: KibanaRequest;
  settings: SessionsSettings;
}): Promise<void> => {
  await taskManager.ensureScheduled(
    {
      id: SESSIONS_TASK_ID,
      taskType: SESSIONS_TASK_TYPE,
      schedule: { interval: settings.frequency },
      params: {},
      state: {},
    },
    // Also while it runs: Task Manager otherwise skips a running task, keeping the old key.
    { request, regenerateApiKey: true, includeRunningTasks: true }
  );
};
