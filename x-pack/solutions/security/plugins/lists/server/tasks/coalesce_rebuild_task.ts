/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, throwRetryableError } from '@kbn/task-manager-plugin/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import {
  assertLookupNames,
  ensureLookupIndexCurrent,
  reconcileCoalesced,
} from '../services/lookup';
import type { PluginsStart } from '../types';

export const COALESCE_REBUILD_TASK_TYPE = 'lists:coalesce-rebuild';

const paramsSchema = schema.object({
  index: schema.string({ maxLength: 1024 }),
  type: schema.string({ maxLength: 64 }),
});

// How many times one run re-reconciles when a write lands during it, before it hands
// the remainder to Task Manager's retry with backoff.
const RECONCILE_PASSES_PER_RUN = 10;

// A write that lands while the task is finishing cannot enqueue a run: the task's
// document still exists, so `ensureScheduled` is a no-op, and `runSoon` is refused for a
// running task. The scheduler retries the enqueue a few times over several seconds, by
// which time the finished task is gone and a fresh one is created.
const ENQUEUE_RETRIES = 3;
const ENQUEUE_RETRY_DELAY_MS = 3000;

/**
 * Deterministic per-list task id, so a burst of writes to one list collapses to a
 * single pending rebuild (ensureScheduled is idempotent on this id).
 */
export const coalesceRebuildTaskId = (index: string): string =>
  `${COALESCE_REBUILD_TASK_TYPE}:${index}`;

/**
 * Registers the coalesced-rebuild task. Task Manager guarantees a single instance
 * per task id runs at a time, so this is the coordination point that makes the
 * per-list coalesced cache converge under concurrent and interrupted writes.
 *
 * The task runs as the Kibana system user, which provisions the per-list indices and
 * holds `.value-list-*` in its reserved role, so no per-write credential is granted or
 * stored and a run never fails because a credential expired. A write that lands during
 * a pass leaves the state stale; the run reconciles again at once rather than waiting
 * out Task Manager's retry backoff, and only a run that stays stale after several
 * passes is handed to that retry.
 */
export const registerCoalesceRebuildTask = ({
  taskManager,
  logger,
  getStartServices,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: CoreSetup<PluginsStart>['getStartServices'];
}): void => {
  taskManager.registerTaskDefinitions({
    [COALESCE_REBUILD_TASK_TYPE]: {
      cost: TaskCost.Normal,
      createTaskRunner: ({
        taskInstance,
      }): {
        cancel: () => Promise<void>;
        run: () => Promise<{ state: Record<string, unknown> }>;
      } => {
        // Task Manager calls `cancel` when a run outlives the task timeout, at which point
        // it may hand the task to another claim. The run reads this flag between steps
        // and stops, so two runs never write the same list for longer than one in-flight
        // step. The list stays dirty with its markers in place; the next claim resumes it.
        let cancelled = false;
        const shouldAbort = (): boolean => cancelled;
        return {
          cancel: async (): Promise<void> => {
            cancelled = true;
          },
          run: async (): Promise<{ state: Record<string, unknown> }> => {
            const { index, type } = taskInstance.params as { index: string; type: Type };
            // The params come from a task document; only a concrete index name this plugin
            // builds is acted on. The task is keyed by that name, never by the alias.
            assertLookupNames({ index });
            const [coreStart] = await getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;
            // The task may be the first writer to an index created by an earlier build (a
            // run left pending across a restart), and its documents carry fields that build
            // did not map. Bring the mapping up to date before writing; one mapping read per
            // index per process.
            await ensureLookupIndexCurrent({ esClient, index, type });

            let outcome = await reconcileCoalesced({ esClient, index, shouldAbort, type });
            for (
              let pass = 1;
              outcome === 'stale' && !cancelled && pass < RECONCILE_PASSES_PER_RUN;
              pass++
            ) {
              outcome = await reconcileCoalesced({ esClient, index, shouldAbort, type });
            }
            if (cancelled) {
              logger.warn(`coalesced rebuild for ${index} stopped at the task timeout`);
              return { state: {} };
            }
            if (outcome === 'stale') {
              throwRetryableError(
                new Error(
                  `coalesced rebuild for ${index} still behind after ${RECONCILE_PASSES_PER_RUN} passes`
                ),
                true
              );
            }
            logger.debug(`coalesced rebuild for ${index}: ${outcome}`);
            return { state: {} };
          },
        };
      },
      description:
        'Rebuilds the coalesced (disjoint interval) projection of a range value list from its source documents, coordinated so only one rebuild runs per list.',
      maxAttempts: 5,
      paramsSchema,
      timeout: '2m',
      title: 'Value list coalesced-range rebuild',
    },
  });
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Idempotently enqueue one rebuild for a list. ensureScheduled with the per-list id
 * collapses concurrent writers to a single pending task, and the task self-deletes
 * on success, so the next write re-enqueues. A task that exhausted its attempts stays
 * in Task Manager as failed and would make ensureScheduled a no-op forever, so such a
 * task is removed first and the new write gets a fresh run. When the task is running
 * at that moment, the enqueue is retried a few seconds later so the write is never
 * left without a run.
 */
export const scheduleCoalesceRebuild = ({
  taskManager,
  logger,
  index,
  type,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  index: string;
  type: Type;
}): void => {
  // One task for each list: the key is the concrete index, which never changes, so a
  // restrict or unrestrict cannot leave two tasks converging the same index.
  assertLookupNames({ index });
  const id = coalesceRebuildTaskId(index);
  const enqueue = async (): Promise<boolean> => {
    const existing = await taskManager.get(id).catch(() => undefined);
    if (existing?.status === 'failed') {
      await taskManager.remove(id).catch(() => undefined);
    }
    await taskManager.ensureScheduled({
      id,
      params: { index, type },
      scope: ['lists'],
      state: {},
      taskType: COALESCE_REBUILD_TASK_TYPE,
    });
    // A pending task that failed earlier waits out its retry backoff. A new write
    // should not wait with it, so ask for a run now. A task that is running right now
    // refuses; the caller retries the whole enqueue once that run has finished.
    const ran = await taskManager
      .runSoon(id)
      .then(() => true)
      .catch(() => false);
    if (ran) return true;
    const current = await taskManager.get(id).catch(() => undefined);
    return current?.status !== 'running';
  };
  const run = async (): Promise<void> => {
    for (let attempt = 0; attempt <= ENQUEUE_RETRIES; attempt++) {
      if (await enqueue()) return;
      await sleep(ENQUEUE_RETRY_DELAY_MS);
    }
    logger.warn(`coalesced rebuild for ${index} is still running; the next write re-enqueues it`);
  };
  run().catch((err) => {
    logger.warn(`failed to schedule coalesced rebuild for ${index}: ${err.message}`);
  });
};
