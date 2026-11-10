/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import { stableStringify } from '@kbn/std';
import { ALL_ENTITY_TYPES } from '../../common/domain/definitions/entity_schema';
import { getErrorMessage } from '../../common';
import { getExtractEntityTaskId } from './extract_entity_task';
import { getHistorySnapshotTaskId } from './history_snapshot_task';
import { entityMaintainersRegistry } from './entity_maintainers/entity_maintainers_registry';
import { getTaskId as getEntityMaintainerTaskId } from './entity_maintainers';
import { getResilienceTaskId } from './resilience_task';
import { getStatusReportTaskId } from './status_report_task';

export interface TaskApiKeyRegenerationFailure {
  id: string;
  message: string;
  statusCode?: number;
}

export interface RegenerateTaskApiKeysResult {
  /** Ids of the tasks that now run with an API key granted from the request. */
  updated: string[];
  /** Tasks that exist but could not be updated, with the reason. Missing tasks are not listed. */
  failed: TaskApiKeyRegenerationFailure[];
}

const NOT_FOUND_STATUS_CODE = 404;

/** Every task id Entity Store can have scheduled for a namespace. Not all of them exist at any time. */
export const getEntityStoreTaskIds = (namespace: string): string[] => [
  ...ALL_ENTITY_TYPES.map((type) => getExtractEntityTaskId(type, namespace)),
  getHistorySnapshotTaskId(namespace),
  getStatusReportTaskId(namespace),
  getResilienceTaskId(namespace),
  ...entityMaintainersRegistry.getAll().map(({ id }) => getEntityMaintainerTaskId(id, namespace)),
];

const getFailureDetails = (
  error: SavedObjectError | ErrorCause
): { message: string; statusCode?: number } => {
  let message;
  let statusCode;

  if ('message' in error) {
    message = error.message;
  }
  if ('reason' in error) {
    message = error.reason;
  }

  if ('statusCode' in error) {
    statusCode = error.statusCode;
  }

  return { message: message ?? 'Unknown error', statusCode };
};

/**
 * Replaces the API key of every Entity Store task in `namespace` with one granted from `request`,
 * so the tasks stop depending on the user who installed the store. Schedules, state and data are
 * left as they are.
 */
export async function regenerateEntityStoreTaskApiKeys({
  taskManager,
  logger,
  namespace,
  request,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  namespace: string;
  request: KibanaRequest;
}): Promise<RegenerateTaskApiKeysResult> {
  const updated: string[] = [];
  const failed: TaskApiKeyRegenerationFailure[] = [];

  // 1. Get info about all the tasks that need to be updated
  const tasksResult = await taskManager.bulkGet(getEntityStoreTaskIds(namespace));

  // 2. Group the tasks by their schedule so we can update them in batches
  const tasksBySchedule = new Map<
    string,
    { schedule: NonNullable<ConcreteTaskInstance['schedule']>; tasks: ConcreteTaskInstance[] }
  >();
  tasksResult.forEach((lookup) => {
    if (lookup.tag === 'err') {
      const { id, error } = lookup.error;
      // Tasks only exist while their engine or maintainer does, so a missing one is expected.
      if (error.statusCode !== NOT_FOUND_STATUS_CODE) {
        failed.push({ id, message: error.message, statusCode: error.statusCode });
      }
      return;
    }

    const task = lookup.value;
    const { schedule } = task;
    if (!schedule) {
      failed.push({ id: task.id, message: 'The task does not have a recurring schedule' });
      return;
    }

    const key = stableStringify(schedule);
    const value = tasksBySchedule.get(key) ?? { schedule, tasks: [] };
    value.tasks.push(task);
    tasksBySchedule.set(key, value);
  });

  // 3. Update the tasks in batches by their schedule
  // `bulkUpdateSchedules` takes one schedule per call, so each call passes the schedule its tasks
  // already have: only the key changes.
  await Promise.all(
    [...tasksBySchedule.values()].map(async ({ schedule, tasks }) => {
      try {
        // 9.5 Task Manager only updates idle tasks. `includeRunningTasks` is not available here,
        // so a task that is running comes back in neither list and is reported in `failed`.
        const result = await taskManager.bulkUpdateSchedules(
          tasks.map(({ id }) => id),
          schedule,
          { request, regenerateApiKey: true, cloneApiKey: true }
        );

        result.tasks.forEach(({ id }) => updated.push(id));
        result.errors.forEach(({ id, error }) => failed.push({ id, ...getFailureDetails(error) }));

        // Tasks in a state Task Manager does not update (e.g. failed) come back in neither list.
        const handled = new Set([
          ...result.tasks.map(({ id }) => id),
          ...result.errors.map(({ id }) => id),
        ]);
        tasks
          .filter(({ id }) => !handled.has(id))
          .forEach(({ id, status }) =>
            failed.push({
              id,
              message: `The task cannot be updated while its status is "${status}"`,
            })
          );
      } catch (error) {
        logger.error(
          `Failed to regenerate API keys of ${tasks.length} task(s) with schedule ${stableStringify(
            schedule
          )}: ${getErrorMessage(error)}`
        );
        tasks.forEach(({ id }) => failed.push({ id, message: getErrorMessage(error) }));
      }
    })
  );

  logger.debug(
    `Regenerated API keys of ${updated.length} Entity Store task(s) in namespace "${namespace}"; ${failed.length} failed`
  );

  return { updated, failed };
}
