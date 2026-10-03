/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { waitFor } from '../wait_for';

interface LaunchTaskResult {
  taskRunThreshold: Date;
  eventQueryStart: Date;
}

export const taskHasRun = async (taskId: string, kbn: KbnClient, after: Date): Promise<boolean> => {
  const task = await kbn.savedObjects.get({
    type: 'task',
    id: taskId,
  });

  const runAt = new Date(task.attributes.runAt);
  const status = task.attributes.status;

  return runAt > after && status === TaskStatus.Idle;
};

export const launchTask = async (
  taskId: string,
  kbn: KbnClient,
  logger: ToolingLog
): Promise<LaunchTaskResult> => {
  logger.info(`Launching task ${taskId}`);
  let eventQueryStart = new Date();
  let taskRunThreshold = new Date();

  await waitFor(
    async () => {
      const attemptStartedAt = new Date();
      const { data } = await kbn.request<{ error?: string; conflict?: boolean }>({
        method: 'POST',
        path: `/internal/ftr/task_manager/${taskId}/run_soon`,
      });

      if (data.conflict || data.error?.includes('currently running')) {
        return false;
      }
      if (data.error) {
        throw new Error(`Failed to launch task ${taskId}: ${data.error}`);
      }
      eventQueryStart = attemptStartedAt;
      // runSoon sets runAt to now, so capture the threshold after it returns: taskHasRun then stays false until the post-run reschedule.
      taskRunThreshold = new Date();
      return true;
    },
    'launchTask',
    logger
  );

  logger.info(`Task ${taskId} launched`);

  return { taskRunThreshold, eventQueryStart };
};
