/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { CoreStart, KibanaRequest, Logger, StartServicesAccessor } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority, throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import type { BriefJob } from '../../../../common/api/entity_analytics/executive_brief/common.gen';
import { hasFindings } from '../../../../common/entity_analytics/executive_brief/brief';
import {
  BRIEF_JOB_DEADLINE_MS,
  BRIEF_TASK_TIMEOUT,
  EXECUTIVE_BRIEF_CLEANUP_TASK_ID,
  EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE,
  EXECUTIVE_BRIEF_GENERATE_TASK_TYPE,
} from '../../../../common/entity_analytics/executive_brief/constants';
import type { StartPlugins } from '../../../plugin';
import { ENTITY_ANALYTICS_EXECUTIVE_BRIEF_COMPLETED_EVENT } from '../../telemetry/event_based/events';
import type { ComposeBriefResult } from './composition/compose';
import { BriefCompositionError, composeBrief } from './composition/compose';
import { BRIEF_SIGNALS } from './signals';
import { runSignals } from './signals/run_signals';
import type { GatherResult } from './signals/types';
import type { BriefStore, JobUpdate } from './store/brief_store';
import type { BriefCompletedEvent } from './telemetry';
import { withBriefSpan } from './telemetry';

const MAX_ERROR_MESSAGE_LENGTH = 1000;

const paramsSchema = schema.object({
  docId: schema.string({ minLength: 1, maxLength: 128 }),
  jobId: schema.string({ minLength: 1, maxLength: 128 }),
  spaceId: schema.string({ minLength: 1, maxLength: 1024 }),
  // The window and connector are fixed when the job starts.
  range: schema.oneOf([schema.literal('24h'), schema.literal('7d'), schema.literal('30d')]),
  from: schema.string({ maxLength: 64 }),
  to: schema.string({ maxLength: 64 }),
  connectorId: schema.string({ minLength: 1, maxLength: 256 }),
});

type GenerateBriefTaskParams = TypeOf<typeof paramsSchema>;

/** The job was replaced or deleted; the run stops without writing. */
class SupersededError extends Error {}

type JobError = NonNullable<BriefJob['error']>;

const toJobError = (error: unknown, abortSignal: AbortSignal, startedAtMs: number): JobError => {
  if (abortSignal.aborted) {
    return Date.now() - startedAtMs >= BRIEF_JOB_DEADLINE_MS
      ? {
          code: 'timeout',
          message: 'The brief took too long to generate and was stopped.',
        }
      : { code: 'interrupted', message: 'The brief generation was interrupted.' };
  }
  const message = (error instanceof Error ? error.message : String(error)).slice(
    0,
    MAX_ERROR_MESSAGE_LENGTH
  );
  return {
    code: error instanceof BriefCompositionError ? error.code : 'internal',
    message,
  };
};

/**
 * Runs one job: running → gather (signals) → compose → verify → succeeded, or failed with an error
 * code. With no findings the AI is not called. A write that finds the job replaced stops the run
 * silently. Reports the EBT completion event however the run ends.
 */
const runBriefJob = async ({
  params: { docId, jobId, spaceId, range, from, to, connectorId },
  fakeRequest,
  store,
  coreStart,
  startPlugins,
  logger,
  abortSignal,
}: {
  params: GenerateBriefTaskParams;
  fakeRequest: KibanaRequest;
  store: BriefStore;
  coreStart: CoreStart;
  startPlugins: StartPlugins;
  logger: Logger;
  abortSignal: AbortSignal;
}): Promise<void> => {
  const startedAtMs = Date.now();
  const update = async (patch: JobUpdate): Promise<void> => {
    if (!(await store.updateJob(docId, jobId, patch))) {
      throw new SupersededError();
    }
  };
  if (!(await store.updateJob(docId, jobId, { job: { status: 'running', stage: 'gather' } }))) {
    logger.debug(`Executive brief job ${jobId} is no longer current; skipping`);
    return;
  }

  const authUser = coreStart.security.authc.getCurrentUser(fakeRequest);
  const run: {
    gathered?: GatherResult;
    composed?: ComposeBriefResult;
    failedTokens?: ComposeBriefResult['tokens'];
    errorCode?: JobError['code'];
  } = {};

  try {
    await withBriefSpan('generate', { range }, async () => {
      const gathered = await withBriefSpan('gather', {}, () =>
        runSignals(
          {
            esClient: coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser,
            spaceId,
            timeRange: { from, to },
            now: new Date(),
            logger,
            // Without a user, signals with per-user visibility only see shared data.
            user: { username: authUser?.username ?? '', profileUid: authUser?.profile_uid },
            getCasesClient: async () => startPlugins.cases?.getCasesClientWithRequest(fakeRequest),
          },
          BRIEF_SIGNALS,
          { abortSignal }
        )
      );
      run.gathered = gathered;
      const { evidence, outcomes } = gathered;
      const composed = hasFindings(evidence)
        ? await withBriefSpan('compose', {}, () =>
            composeBrief({
              inferenceClient: startPlugins.inference.getClient({
                request: fakeRequest,
                bindTo: { connectorId },
              }),
              evidence,
              signals: outcomes,
              timeRange: { from, to, range },
              abortSignal,
              logger,
              onStage: (stage) => update({ job: { stage } }),
            })
          )
        : undefined;
      run.composed = composed;
      abortSignal.throwIfAborted();
      await update({
        job: { status: 'succeeded' },
        report: { ...composed?.brief, entities: evidence.entities, facts: evidence.facts },
        metadata: {
          generatedAt: new Date().toISOString(),
          period: { range, from, to },
          connectorId,
          ...(composed?.model ? { model: composed.model } : {}),
          ...(composed ? { tokens: composed.tokens, verification: composed.verification } : {}),
          signals: evidence.signals,
        },
      });
    });
  } catch (error) {
    if (error instanceof SupersededError) {
      logger.debug(`Executive brief job ${jobId} was replaced; stopping`);
      run.errorCode = 'interrupted';
    } else {
      run.failedTokens = error instanceof BriefCompositionError ? error.tokens : undefined;
      const jobError = toJobError(error, abortSignal, startedAtMs);
      run.errorCode = jobError.code;
      logger.error(`Executive brief job ${jobId} failed (${jobError.code}): ${jobError.message}`);
      await store
        .updateJob(docId, jobId, { job: { status: 'failed', error: jobError } })
        .catch((writeError) => logger.error(`Could not record the failure: ${writeError.message}`));
    }
  }

  const { gathered, composed, failedTokens, errorCode } = run;
  const tokens = composed?.tokens ?? failedTokens;
  const event: BriefCompletedEvent = {
    outcome: errorCode ? 'failed' : 'succeeded',
    ...(errorCode ? { errorCode } : {}),
    range,
    ...(composed?.model ? { model: composed.model } : {}),
    durationMs: Date.now() - startedAtMs,
    signals: (gathered?.outcomes ?? []).map(({ id, status, took, factCount }) => ({
      id,
      status,
      durationMs: took,
      factCount,
    })),
    entityCount: Object.keys(gathered?.evidence.entities ?? {}).length,
    factCount: gathered?.evidence.facts.length ?? 0,
    ...(tokens ? { tokens: { prompt: tokens.prompt, completion: tokens.completion } } : {}),
    repaired: composed?.verification.repaired ?? false,
    levelsLowered: composed?.verification.lowered ?? 0,
    verificationDropped: composed?.verification.dropped ?? {},
  };
  coreStart.analytics.reportEvent(
    ENTITY_ANALYTICS_EXECUTIVE_BRIEF_COMPLETED_EVENT.eventType,
    event
  );
};

/** Registers the one-shot generate task and the daily retention cleanup. */
export const registerBriefTasks = ({
  taskManager,
  getStartServices,
  getBriefStore,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  getStartServices: StartServicesAccessor<StartPlugins>;
  getBriefStore: () => Promise<BriefStore>;
  logger: Logger;
}): void => {
  taskManager.registerTaskDefinitions({
    [EXECUTIVE_BRIEF_GENERATE_TASK_TYPE]: {
      title: 'Entity Analytics: generate executive brief',
      description:
        'Gathers Entity Analytics evidence and composes an AI executive brief for a user.',
      // Gather has a 45 s budget; composition is one LLM call plus at most one repair.
      timeout: BRIEF_TASK_TIMEOUT,
      // One-shot: the user retries from the UI.
      maxAttempts: 1,
      priority: TaskPriority.UserInteractive,
      // Fans out to several ES queries and holds the evidence and LLM response in memory.
      cost: TaskCost.Large,
      paramsSchema,
      // Task Manager aborts `signal` on timeout; the run then fails with `timeout`.
      createTaskRunner: ({ taskInstance, fakeRequest, signal }: RunContext) => ({
        run: async () => {
          // Validated against paramsSchema when the task was scheduled.
          const params = taskInstance.params as GenerateBriefTaskParams;
          const store = await getBriefStore();
          if (!fakeRequest) {
            const error = {
              code: 'internal' as const,
              message: 'The task has no user credentials.',
            };
            await store
              .updateJob(params.docId, params.jobId, { job: { status: 'failed', error } })
              .catch(() => false);
            throwUnrecoverableError(
              new Error('Cannot generate an executive brief without an API key')
            );
            return { state: {} };
          }
          const [coreStart, startPlugins] = await getStartServices();
          await runBriefJob({
            params,
            fakeRequest,
            store,
            coreStart,
            startPlugins,
            logger,
            abortSignal: signal,
          });
          return { state: {} };
        },
      }),
    },
    [EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE]: {
      title: 'Entity Analytics: executive brief retention cleanup',
      description: 'Deletes executive briefs past their expiry date.',
      // A single delete-by-query over a small index (one document per user and space).
      timeout: '5m',
      cost: TaskCost.Tiny,
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          try {
            const deleted = await (await getBriefStore()).deleteExpired(signal);
            logger.debug(`Executive brief cleanup deleted ${deleted} expired brief(s)`);
          } catch (error) {
            logger.error(`Executive brief cleanup failed: ${error.message}`);
          }
          return { state: {} };
        },
      }),
    },
  });
};

/** Ensures the daily cleanup is scheduled. */
export const scheduleCleanupTask = async (taskManager: TaskManagerStartContract): Promise<void> => {
  await taskManager.ensureScheduled({
    id: EXECUTIVE_BRIEF_CLEANUP_TASK_ID,
    taskType: EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE,
    schedule: { interval: '1d' },
    state: {},
    params: {},
  });
};

/** Schedules a generate task as the requesting user and asks for an immediate claim. */
export const scheduleGenerateBriefTask = async ({
  taskManager,
  request,
  params,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  request: KibanaRequest;
  params: GenerateBriefTaskParams;
  logger: Logger;
}): Promise<void> => {
  const id = `${EXECUTIVE_BRIEF_GENERATE_TASK_TYPE}:${params.jobId}`;
  await taskManager.schedule(
    { id, taskType: EXECUTIVE_BRIEF_GENERATE_TASK_TYPE, params, state: {} },
    { request, cloneApiKey: true }
  );
  // Not awaited: regular polling still picks the task up if this fails (e.g. already claimed).
  taskManager.runSoon(id, { requestImmediateClaim: true }).catch((error) => {
    logger.debug(`Could not request an immediate claim for task ${id}: ${error.message}`);
  });
};
