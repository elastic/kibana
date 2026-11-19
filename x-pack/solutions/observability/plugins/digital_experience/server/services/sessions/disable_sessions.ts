/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { SESSIONS_TASK_ID } from '../../../common/sessions';
import { getSessionsTask } from './sessions_status';

/**
 * Turns sessions off: the summaries task stops running, keeping its state, its API key and the
 * summaries built so far. Enabling again replaces the key and carries on from the checkpoint.
 * Resolves to false when sessions were never set up.
 */
export const disableSessions = async ({
  taskManager,
  request,
}: {
  taskManager: TaskManagerStartContract;
  request: KibanaRequest;
}): Promise<boolean> => {
  const task = await getSessionsTask(taskManager);
  if (!task) {
    return false;
  }
  if (task.enabled === false) {
    return true;
  }
  // Task Manager only updates a task with an API key given a request; it keeps the key.
  const {
    errors: [failure],
  } = await taskManager.bulkDisable([SESSIONS_TASK_ID], false, { request });
  if (failure) {
    throw new Error(`Could not turn the summaries task off: ${JSON.stringify(failure.error)}`);
  }
  return true;
};
