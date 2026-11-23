/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { CoreSetup, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import { isResponseError } from '@kbn/es-errors';
import { TaskCost, decodeStoredApiKey } from '@kbn/task-manager-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  MOBILE_SESSIONS_RECONCILE_HOURS,
  MOBILE_SESSIONS_RECONCILE_INTERVAL_MINUTES,
  type SessionsSettings,
} from '../../../common/sessions';
import { describeError } from '../../lib/helpers/errors';
import { esqlMaxRows } from './esql_max_rows';
import {
  createSessionsIndex,
  putSessionsIndexTemplate,
  sessionsIndexExists,
} from './sessions_index';
import type { SessionsPlatform } from './sessions_platforms';
import {
  INITIAL_WINDOW_MS,
  summarizeSessions,
  type SummarizeSessionsResult,
} from './summarize_sessions';

/** No window starts after this much of a run, so it ends well before its timeout. */
const RUN_BUDGET_MS = 45 * 1000;
/**
 * A window stops between rounds of summary queries after this, a minute before the task's timeout:
 * Task Manager drops the result of a run that outlasts it, so the next run would retry the same
 * window without end.
 */
const RUN_TIME_LIMIT_MS = 4 * 60 * 1000;

export const RECONCILE_INTERVAL_MS = MOBILE_SESSIONS_RECONCILE_INTERVAL_MINUTES * 60 * 1000;
export const RECONCILE_MS = MOBILE_SESSIONS_RECONCILE_HOURS * 60 * 60 * 1000;

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

/** The state of a platform's task that rebuilds its recent sessions, as the mobile one does. */
const reconcilingStateSchemaV1 = stateSchemaV1.extends({
  /** The pass under way has summarized every event from its start up to here. */
  reconcileFrom: schema.maybe(schema.nullable(schema.string())),
  /** Where the pass under way ends: the checkpoint when it started. */
  reconcileUntil: schema.maybe(schema.nullable(schema.string())),
  reconcileWindowMs: schema.maybe(schema.number()),
  lastReconcileStartedAt: schema.maybe(schema.nullable(schema.string())),
});

/** A task's state; the browser task's has none of the reconcile fields. */
export type SessionsTaskState = TypeOf<typeof reconcilingStateSchemaV1>;
type ReconcileState = Pick<
  SessionsTaskState,
  'reconcileFrom' | 'reconcileUntil' | 'reconcileWindowMs' | 'lastReconcileStartedAt'
>;

/** The sessions settings the task runs with. */
export interface SessionsTaskSettings extends SessionsSettings {
  /** Summary queries run at once. */
  concurrency: number;
}

export interface RunSessionsTaskParams {
  platform: SessionsPlatform;
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
 * as `ApiKey base64(id:key)`. `null` for any other credential, such as a UIAM key, whose raw
 * secret has no id to decode.
 */
export const apiKeyIdOf = (request: KibanaRequest): string | null => {
  const header = HTTPAuthorizationHeader.parseFromRequest(request);
  if (header?.scheme.toLowerCase() !== 'apikey') {
    return null;
  }
  const { id, secret } = decodeStoredApiKey(header.credentials);
  return secret && API_KEY_ID.test(id) ? id : null;
};

const logErrorChange = (
  logger: Logger,
  platform: SessionsPlatform,
  previous: SessionsTaskState,
  message: string
) => {
  if (previous.lastError?.message !== message) {
    logger.warn(`Summarizing ${platform.label} failed: ${message}`);
  }
};

/**
 * Why a run of this Kibana stands down: the summaries belong to a newer version, which owns the
 * index and its template.
 */
export const newerVersionMessage = (version: number, currentVersion: number) =>
  `The session summaries are version ${version}, newer than this Kibana builds (version ${currentVersion}), so it left them to the nodes that can.`;

const reconcileStateOf = ({
  reconcileFrom,
  reconcileUntil,
  reconcileWindowMs,
  lastReconcileStartedAt,
}: SessionsTaskState): ReconcileState => ({
  reconcileFrom,
  reconcileUntil,
  reconcileWindowMs,
  lastReconcileStartedAt,
});

interface ReconcilePass {
  from: string;
  until: string;
  windowMs: number;
  startedAt: string;
}

/**
 * The pass that rebuilds the recent sessions to run now: the one under way, or a new one over the
 * `RECONCILE_MS` before the checkpoint once the last one started `RECONCILE_INTERVAL_MS` ago.
 */
export const reconcilePassOf = (
  state: ReconcileState,
  checkpoint: string,
  now: number
): ReconcilePass | null => {
  const { reconcileFrom, reconcileUntil, reconcileWindowMs, lastReconcileStartedAt } = state;
  if (reconcileFrom && reconcileUntil) {
    return {
      from: reconcileFrom,
      until: reconcileUntil,
      windowMs: reconcileWindowMs ?? INITIAL_WINDOW_MS,
      startedAt: lastReconcileStartedAt ?? new Date(now).toISOString(),
    };
  }
  if (lastReconcileStartedAt && now - Date.parse(lastReconcileStartedAt) < RECONCILE_INTERVAL_MS) {
    return null;
  }
  return {
    from: new Date(Date.parse(checkpoint) - RECONCILE_MS).toISOString(),
    until: checkpoint,
    windowMs: INITIAL_WINDOW_MS,
    startedAt: new Date(now).toISOString(),
  };
};

/** The state of the pass after a run of it: done once it reached its end. */
const afterReconcilePass = (
  pass: ReconcilePass,
  { checkpoint, windowMs, caughtUp }: SummarizeSessionsResult
): ReconcileState => ({
  reconcileFrom: caughtUp ? null : checkpoint,
  reconcileUntil: caughtUp ? null : pass.until,
  reconcileWindowMs: windowMs,
  lastReconcileStartedAt: pass.startedAt,
});

/**
 * One run: summarizes the sessions with new events, window by window, and runs again right away
 * while it hasn't caught up. Once caught up, a platform that reconciles then rebuilds its recent
 * sessions with the rest of the run's time. Failures are kept in the state rather than thrown, so
 * the next run retries from the same checkpoint and the status shows them.
 */
export const runSessionsTask = async ({
  platform,
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
    logErrorChange(logger, platform, state, NO_API_KEY_MESSAGE);
    return {
      state: { ...state, lastRunAt: at, lastError: { message: NO_API_KEY_MESSAGE, at } },
    };
  }

  // Set up by a newer Kibana (a rollback, or an older node during a rolling upgrade): the
  // summaries and the index template are that version's, so this node leaves them alone instead
  // of rebuilding them as its own, which would overwrite the template and restart the backfill
  // every time the task moved between them.
  if (state.version != null && state.version > platform.version) {
    const message = newerVersionMessage(state.version, platform.version);
    if (state.lastError?.message !== message) {
      logger.warn(message);
    }
    return { state: { ...state, lastRunAt: at, lastError: { message, at } } };
  }

  const started = Date.now();
  // A deleted index, or a new version, is rebuilt from the lookback, also after a failed run.
  let rebuild = state.version !== platform.version;
  try {
    // The template has to be in place before the index is created, or the index gets dynamic
    // mappings and nothing repairs it until the next version. Put it while rebuilding, and
    // whenever the index is missing, which covers a template that was deleted by hand.
    if (rebuild || !(await sessionsIndexExists(esClient, platform, signal))) {
      await putSessionsIndexTemplate(internalClient, platform, signal);
    }
    const created = await createSessionsIndex(esClient, platform, signal);
    rebuild = rebuild || created;
    // Once a run: the setting only changes with the cluster, and every query of the run is
    // split against it.
    const maxRows = await esqlMaxRows(internalClient, signal);
    const result = await summarizeSessions({
      platform,
      esClient,
      signal,
      now,
      checkpoint: rebuild ? null : state.checkpoint ?? null,
      windowMs: rebuild ? INITIAL_WINDOW_MS : state.windowMs ?? INITIAL_WINDOW_MS,
      budgetMs: RUN_BUDGET_MS,
      timeLimitMs: RUN_TIME_LIMIT_MS,
      concurrency,
      logger,
      maxRows,
    });

    const caughtUp = (!rebuild && state.caughtUp === true) || result.caughtUp;
    if (caughtUp && state.caughtUp !== true) {
      logger.info(`${platform.taskTitle} caught up with the events.`);
    }

    let reconcileState: ReconcileState = {};
    let reconcileError: string | null = null;
    if (platform.reconcile) {
      // A rebuild reads every event anyway, so the first pass waits for the interval after it.
      reconcileState = rebuild
        ? {
            reconcileFrom: null,
            reconcileUntil: null,
            reconcileWindowMs: INITIAL_WINDOW_MS,
            lastReconcileStartedAt: at,
          }
        : reconcileStateOf(state);
      const pass = result.caughtUp ? reconcilePassOf(reconcileState, result.checkpoint, now) : null;
      const elapsed = Date.now() - started;
      if (pass && elapsed < RUN_BUDGET_MS) {
        // A failed pass leaves the regular one's progress in place, and is retried next run.
        try {
          reconcileState = afterReconcilePass(
            pass,
            await summarizeSessions({
              platform,
              esClient,
              signal,
              now,
              checkpoint: pass.from,
              until: Date.parse(pass.until),
              rebuildUntil: Date.parse(result.checkpoint),
              windowMs: pass.windowMs,
              budgetMs: RUN_BUDGET_MS - elapsed,
              timeLimitMs: RUN_TIME_LIMIT_MS - elapsed,
              concurrency,
              logger,
              maxRows,
            })
          );
        } catch (error) {
          reconcileError = describeError(error);
          reconcileState = {
            reconcileFrom: pass.from,
            reconcileUntil: pass.until,
            reconcileWindowMs: pass.windowMs,
            lastReconcileStartedAt: pass.startedAt,
          };
          logErrorChange(logger, platform, state, reconcileError);
        }
      }
    }

    if (state.lastError && !reconcileError) {
      logger.info(`Summarizing ${platform.label} works again.`);
    }
    return {
      state: {
        version: platform.version,
        checkpoint: result.checkpoint,
        windowMs: result.windowMs,
        caughtUp,
        lastRunAt: at,
        lastSuccessAt: at,
        lastError: reconcileError ? { message: reconcileError, at } : null,
        apiKeyInvalid: false,
        failedApiKeyId: null,
        ...reconcileState,
      },
      // Behind: run again right away instead of waiting for the interval.
      ...(result.caughtUp ? {} : { runAt: new Date() }),
    };
  } catch (error) {
    const message = describeError(error);
    const unauthorized = isResponseError(error) && error.statusCode === 401;
    logErrorChange(logger, platform, state, message);
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

/** Kibana memory each summary query in flight holds, about. */
const MB_PER_SUMMARY_QUERY = 50;
/** The most memory Task Manager budgets a task of each cost for, about. */
const TASK_COST_MB: ReadonlyArray<[TaskCost, number]> = [
  [TaskCost.Normal, 50],
  [TaskCost.Large, 100],
  [TaskCost.ExtraLarge, 250],
];

/**
 * What a run costs Task Manager, which budgets a node's capacity by it: the cheapest cost whose
 * memory covers the summary queries in flight, so one is an ordinary task, the default of two a
 * large one, and up to the maximum of four an extra large one. A task type's cost is fixed at
 * registration, so it follows the configured concurrency rather than a single run's.
 */
export const taskCostOf = (concurrency: number): TaskCost => {
  const mb = concurrency * MB_PER_SUMMARY_QUERY;
  return TASK_COST_MB.find(([, budget]) => mb <= budget)?.[0] ?? TaskCost.ExtraLarge;
};

/**
 * Registers the task that builds a platform's session summaries with ES|QL. It runs with the API
 * key Task Manager granted on behalf of the user who enabled sessions, never as the internal user,
 * so it only summarizes what that user can read. Only the index template is the internal user's.
 */
export const registerSessionsTask = ({
  platform,
  core,
  logger,
  taskManager,
  settings,
}: {
  platform: SessionsPlatform;
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  settings: SessionsTaskSettings;
}): void => {
  const stateSchema = platform.reconcile ? reconcilingStateSchemaV1 : stateSchemaV1;
  taskManager.registerTaskDefinitions({
    [platform.taskType]: {
      title: platform.taskTitle,
      description: platform.taskDescription,
      // A run starts no window after 45s and stops one after 4m; this only stops one stuck on a
      // query.
      timeout: '5m',
      cost: taskCostOf(settings.concurrency),
      stateSchemaByVersion: { 1: { schema: stateSchema, up: (state) => state } },
      createTaskRunner: ({ taskInstance, signal, fakeRequest }) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const result = await runSessionsTask({
            platform,
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
 * Schedules a platform's task with an API key granted on behalf of `request`'s user, or gives an
 * existing task a new key, which keeps its state and so its checkpoint. The previous key is
 * invalidated.
 */
export const scheduleSessionsTask = async ({
  platform,
  taskManager,
  request,
  settings,
}: {
  platform: SessionsPlatform;
  taskManager: TaskManagerStartContract;
  request: KibanaRequest;
  settings: SessionsSettings;
}): Promise<void> => {
  await taskManager.ensureScheduled(
    {
      id: platform.taskId,
      taskType: platform.taskType,
      schedule: { interval: settings.frequency },
      params: {},
      state: {},
    },
    // Also while it runs: Task Manager otherwise skips a running task, keeping the old key.
    { request, regenerateApiKey: true, includeRunningTasks: true }
  );
};
