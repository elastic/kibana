/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest, Logger, StartServicesAccessor } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority, throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import {
  BRIEF_TASK_TIMEOUT,
  EXECUTIVE_BRIEF_GENERATE_TASK_TYPE,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefRange } from '../../../../../common/entity_analytics/executive_brief/constants';
import type { StartPlugins } from '../../../../plugin';
import { composeVerifiedBrief } from '../composition/compose_verified_brief';
import { BriefAbortReason, runBrief } from '../pipeline/run_brief';
import type { RunBriefDeps } from '../pipeline/run_brief';
import { BRIEF_SIGNALS } from '../signals';
import { runSignals } from '../signals/run_signals';
import type { SignalContext } from '../signals/types';
import type { BriefStore } from '../store/brief_store';

/** Keep in sync with BRIEF_TASK_TIMEOUT ('5m'); used to tell a timeout from an interruption. */
const BRIEF_TASK_TIMEOUT_MS = 5 * 60 * 1000;

export interface GenerateBriefTaskParams {
  docId: string;
  jobId: string;
  spaceId: string;
  /** The window and connector for this run, fixed when the job was started. */
  range: BriefRange;
  from: string;
  to: string;
  connectorId: string;
}

const paramsSchema = schema.object({
  docId: schema.string({ minLength: 1, maxLength: 128 }),
  jobId: schema.string({ minLength: 1, maxLength: 128 }),
  spaceId: schema.string({ minLength: 1, maxLength: 1024 }),
  range: schema.oneOf([schema.literal('24h'), schema.literal('7d'), schema.literal('30d')]),
  from: schema.string({ maxLength: 64 }),
  to: schema.string({ maxLength: 64 }),
  connectorId: schema.string({ minLength: 1, maxLength: 256 }),
});

export interface GenerateBriefTaskDeps {
  getStartServices: StartServicesAccessor<StartPlugins>;
  getBriefStore: () => Promise<BriefStore>;
  logger: Logger;
  /** Overridable for tests; defaults to the real signal engine and composition. */
  runBriefDeps?: RunBriefDeps;
}

const defaultRunBriefDeps = (): RunBriefDeps => ({
  runSignals,
  signals: BRIEF_SIGNALS,
  composeVerifiedBrief,
});

/** Builds the runner for one generate task instance (exported for tests). */
export const createGenerateBriefTaskRunner = (
  {
    taskInstance,
    fakeRequest,
    signal,
  }: Pick<RunContext, 'taskInstance' | 'fakeRequest' | 'signal'>,
  {
    getStartServices,
    getBriefStore,
    logger,
    runBriefDeps = defaultRunBriefDeps(),
  }: GenerateBriefTaskDeps
) => {
  const params = taskInstance.params as GenerateBriefTaskParams;
  const { docId, jobId } = params;
  const controller = new AbortController();
  const startedAtMs = Date.now();

  const abortReason = (): BriefAbortReason =>
    Date.now() - startedAtMs >= BRIEF_TASK_TIMEOUT_MS
      ? new BriefAbortReason('timeout', 'The brief took too long to generate and was stopped.')
      : new BriefAbortReason('interrupted', 'The brief generation was interrupted.');

  const abort = () => {
    if (!controller.signal.aborted) {
      controller.abort(abortReason());
    }
  };
  signal.addEventListener('abort', abort, { once: true });

  return {
    run: async () => {
      const store = await getBriefStore();

      if (!fakeRequest) {
        await store
          .failJob({
            docId,
            jobId,
            error: { code: 'internal', message: 'The brief task has no user credentials.' },
          })
          .catch(() => false);
        throwUnrecoverableError(
          new Error('Cannot generate an executive brief without a request (missing API key)')
        );
        return { state: {} };
      }

      try {
        await runGenerateBrief({
          params,
          fakeRequest,
          store,
          getStartServices,
          logger,
          abortSignal: controller.signal,
          runBriefDeps,
        });
      } finally {
        signal.removeEventListener('abort', abort);
      }
      return { state: {} };
    },
    /** Called by Task Manager on timeout: stop the run and record the failure right away. */
    cancel: async () => {
      abort();
      const reason = controller.signal.reason;
      const code = reason instanceof BriefAbortReason ? reason.code : 'interrupted';
      const store = await getBriefStore();
      await store
        .failJob({
          docId,
          jobId,
          error: {
            code: code === 'superseded' ? 'interrupted' : code,
            message: reason instanceof Error ? reason.message : 'The brief generation was stopped.',
          },
        })
        .catch((error) => {
          logger.warn(`Could not record cancellation of executive brief job ${jobId}: ${error}`);
        });
    },
  };
};

const runGenerateBrief = async ({
  params,
  fakeRequest,
  store,
  getStartServices,
  logger,
  abortSignal,
  runBriefDeps,
}: {
  params: GenerateBriefTaskParams;
  fakeRequest: KibanaRequest;
  store: BriefStore;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
  abortSignal: AbortSignal;
  runBriefDeps: RunBriefDeps;
}): Promise<void> => {
  const { docId, jobId, spaceId, range, from, to, connectorId } = params;

  const stored = await store.getForJob({ docId, jobId });
  if (!stored) {
    logger.debug(`Executive brief job ${jobId} is no longer current; skipping`);
    return;
  }

  const [coreStart, startPlugins] = await getStartServices();
  const authUser = coreStart.security.authc.getCurrentUser(fakeRequest);

  const signalContext: SignalContext = {
    esClient: coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser,
    spaceId,
    timeRange: { from, to },
    now: new Date(),
    logger,
    user: {
      username: authUser?.username ?? stored.document.owner.username,
      profileUid: authUser?.profile_uid,
    },
    getCasesClient: async () => startPlugins.cases?.getCasesClientWithRequest(fakeRequest),
  };

  const outcome = await runBrief({
    docId,
    jobId,
    params: { range, from, to, connector_id: connectorId },
    store,
    signalContext,
    inferenceClient: startPlugins.inference.getClient({
      request: fakeRequest,
      bindTo: { connectorId },
    }),
    abortSignal,
    logger,
    deps: runBriefDeps,
  });

  logger.debug(`Executive brief job ${jobId} finished: ${outcome.status}`);
};

/** Registers the one-shot generate task type. Call in plugin setup when the flag is on. */
export const registerGenerateBriefTask = ({
  taskManager,
  ...deps
}: GenerateBriefTaskDeps & { taskManager: TaskManagerSetupContract }): void => {
  taskManager.registerTaskDefinitions({
    [EXECUTIVE_BRIEF_GENERATE_TASK_TYPE]: {
      title: 'Entity Analytics: generate executive brief',
      description:
        'Gathers Entity Analytics evidence and composes an AI executive brief for a user.',
      // Gather has a 45 s budget and composition is one LLM call plus at most one repair.
      timeout: BRIEF_TASK_TIMEOUT,
      maxAttempts: 1,
      // A user is waiting on the flyout.
      priority: TaskPriority.UserInteractive,
      // Fans out to several ES queries and holds the evidence and LLM response in memory.
      cost: TaskCost.Large,
      paramsSchema,
      createTaskRunner: (context: RunContext) => createGenerateBriefTaskRunner(context, deps),
    },
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
}): Promise<string> => {
  const id = `${EXECUTIVE_BRIEF_GENERATE_TASK_TYPE}:${params.jobId}`;
  await taskManager.schedule(
    { id, taskType: EXECUTIVE_BRIEF_GENERATE_TASK_TYPE, params, state: {} },
    { request, cloneApiKey: true }
  );

  // Not awaited: regular polling still picks the task up if this fails (e.g. already claimed).
  Promise.resolve()
    .then(() => taskManager.runSoon(id, { requestImmediateClaim: true }))
    .catch((error) => {
      logger.debug(`Could not request an immediate claim for task ${id}: ${error.message}`);
    });

  return id;
};
