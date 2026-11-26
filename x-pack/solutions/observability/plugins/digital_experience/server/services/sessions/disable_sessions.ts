/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { SESSIONS_PLATFORMS } from './sessions_platforms';
import { getSessionsTask } from './sessions_status';

/**
 * Turns sessions off: every platform's summaries task stops running, keeping its state, its API
 * key and the summaries built so far. Enabling again replaces the keys and carries on from the
 * checkpoints. Resolves to false when sessions were never set up.
 */
export const disableSessions = async ({
  taskManager,
  request,
}: {
  taskManager: TaskManagerStartContract;
  request: KibanaRequest;
}): Promise<boolean> => {
  const tasks = await Promise.all(
    SESSIONS_PLATFORMS.map((platform) => getSessionsTask(taskManager, platform))
  );
  const installed = tasks.filter((task) => task !== undefined);
  if (installed.length === 0) {
    return false;
  }
  const enabledIds = installed.filter(({ enabled }) => enabled !== false).map(({ id }) => id);
  if (enabledIds.length === 0) {
    return true;
  }
  // Task Manager only updates a task with an API key given a request; it keeps the key.
  const {
    errors: [failure],
  } = await taskManager.bulkDisable(enabledIds, false, { request });
  if (failure) {
    throw new Error(`Could not turn the summaries task off: ${JSON.stringify(failure.error)}`);
  }
  return true;
};
