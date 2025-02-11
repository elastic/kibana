/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { KbnClient } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';

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
  logger: ToolingLog,
  delayMillis: number = 1_000
): Promise<Date> => {
  logger.info(`Launching task ${taskId}`);
  const task = await kbn.savedObjects.get({
    type: 'task',
    id: taskId,
  });

  const runAt = new Date(Date.now() + delayMillis).toISOString();

  await kbn.savedObjects.update({
    type: 'task',
    id: taskId,
    attributes: {
      ...task.attributes,
      runAt,
      scheduledAt: runAt,
      status: TaskStatus.Idle,
    },
  });

  logger.info(`Task ${taskId} launched`);

  return new Date(runAt);
};
