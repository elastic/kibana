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

import type { CoalesceRebuildApiKeyAttributes } from '../saved_objects/coalesce_rebuild_api_key';
import {
  COALESCE_REBUILD_API_KEY_SO_TYPE,
  coalesceRebuildApiKeySoId,
} from '../saved_objects/coalesce_rebuild_api_key';
import { reconcileCoalesced } from '../services/lookup';
import type { PluginsStart } from '../types';

export const COALESCE_REBUILD_TASK_TYPE = 'lists:coalesce-rebuild';

const paramsSchema = schema.object({
  index: schema.string({ maxLength: 1024 }),
  type: schema.string({ maxLength: 64 }),
});

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
 * The task authenticates with an API key granted on behalf of the writing user and
 * scoped to the list's access name, read from an encrypted saved object keyed by that
 * name. The internal user has no privileges on the per-list indices.
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
      }): { run: () => Promise<{ state: Record<string, unknown> }> } => ({
        run: async (): Promise<{ state: Record<string, unknown> }> => {
          const { index, type } = taskInstance.params as { index: string; type: Type };
          const [coreStart, pluginsStart] = await getStartServices();

          const encryptedSavedObjects = pluginsStart.encryptedSavedObjects.getClient({
            includedHiddenTypes: [COALESCE_REBUILD_API_KEY_SO_TYPE],
          });
          const { attributes } =
            await encryptedSavedObjects.getDecryptedAsInternalUser<CoalesceRebuildApiKeyAttributes>(
              COALESCE_REBUILD_API_KEY_SO_TYPE,
              coalesceRebuildApiKeySoId(index)
            );

          const esClient = coreStart.elasticsearch.client.asScoped({
            headers: { authorization: `ApiKey ${attributes.apiKey}` },
          }).asCurrentUser;

          const outcome = await reconcileCoalesced({ esClient, index, type });

          if (outcome === 'stale') {
            // A newer write landed while we rebuilt, so the cache is behind again.
            // Retry with backoff to reconcile against the newer sources.
            throwRetryableError(
              new Error(`coalesced rebuild for ${index} superseded by a newer write`),
              true
            );
          }
          logger.debug(`coalesced rebuild for ${index}: ${outcome}`);
          return { state: {} };
        },
      }),
      description:
        'Rebuilds the coalesced (disjoint interval) projection of a range value list from its source documents, coordinated so only one rebuild runs per list.',
      maxAttempts: 5,
      paramsSchema,
      timeout: '2m',
      title: 'Value list coalesced-range rebuild',
    },
  });
};

/**
 * Idempotently enqueue one rebuild for a list. ensureScheduled with the per-list id
 * collapses concurrent writers to a single pending task, and the task self-deletes
 * on success, so the next write re-enqueues. A task that exhausted its attempts stays
 * in Task Manager as failed and would make ensureScheduled a no-op forever, so such a
 * task is removed first and the new write gets a fresh run.
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
  const id = coalesceRebuildTaskId(index);
  const run = async (): Promise<void> => {
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
    // should not wait with it, so ask for a run now; a task already running or
    // already due rejects harmlessly.
    await taskManager.runSoon(id).catch(() => undefined);
  };
  run().catch((err) => {
    logger.warn(`failed to schedule coalesced rebuild for ${index}: ${err.message}`);
  });
};
