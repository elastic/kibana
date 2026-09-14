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

import { reconcileCoalesced } from '../services/lookup';
import type { PluginsStart } from '../types';

export const COALESCE_REBUILD_TASK_TYPE = 'lists:coalesce-rebuild';

const paramsSchema = schema.object({
  // Base64 "id:api_key" for an API key granted on behalf of the request user,
  // scoped to this list's index. The task authenticates with it instead of the
  // internal user, which has no privileges on `.value-list-*`. POC note: this key
  // rides in the task params in the clear; production should store it in an
  // encrypted saved object, as alerting does for rule execution.
  apiKey: schema.string({ maxLength: 4096 }),
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
          const { index, type, apiKey } = taskInstance.params as {
            index: string;
            type: Type;
            apiKey: string;
          };
          const [coreStart] = await getStartServices();
          // Authenticate as the granted API key (scoped to this list's index), not
          // the internal user, which cannot read or write `.value-list-*`.
          const esClient = coreStart.elasticsearch.client.asScoped({
            headers: { authorization: `ApiKey ${apiKey}` },
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
 * on success, so the next write re-enqueues.
 */
export const scheduleCoalesceRebuild = ({
  taskManager,
  logger,
  index,
  type,
  apiKey,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  index: string;
  type: Type;
  apiKey: string;
}): void => {
  taskManager
    .ensureScheduled({
      id: coalesceRebuildTaskId(index),
      params: { apiKey, index, type },
      scope: ['lists'],
      state: {},
      taskType: COALESCE_REBUILD_TASK_TYPE,
    })
    .catch((err) => {
      logger.warn(`failed to schedule coalesced rebuild for ${index}: ${err.message}`);
    });
};
