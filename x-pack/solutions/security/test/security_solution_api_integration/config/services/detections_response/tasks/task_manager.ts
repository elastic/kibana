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

const taskRunCount = async (taskId: string, kbn: KbnClient): Promise<number> => {
  const task = await kbn.savedObjects.get<{ state?: string }>({
    type: 'task',
    id: taskId,
  });

  const state: { runs?: number } = JSON.parse(task.attributes.state ?? '{}');

  return state.runs ?? 0;
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

/**
 * Launches `taskId` and polls `condition` until it holds, relaunching the task whenever a run
 * completes without satisfying it, as happens when a telemetry task no-ops because Elastic's
 * telemetry services were momentarily unreachable.
 */
export const launchTaskAndWaitFor = async (
  taskId: string,
  kbn: KbnClient,
  logger: ToolingLog,
  conditionName: string,
  condition: () => Promise<boolean>,
  maxTimeout: number = 180_000
): Promise<void> => {
  let runs = await taskRunCount(taskId, kbn);
  await launchTask(taskId, kbn, logger);

  await waitFor(
    async () => {
      if (await condition()) {
        return true;
      }

      const currentRuns = await taskRunCount(taskId, kbn);
      if (currentRuns > runs) {
        runs = currentRuns;
        logger.info(`Task ${taskId} ran without satisfying the condition, relaunching it`);
        await launchTask(taskId, kbn, logger);
      }

      return false;
    },
    `task ${taskId} to satisfy '${conditionName}'`,
    logger,
    maxTimeout
  );
};
