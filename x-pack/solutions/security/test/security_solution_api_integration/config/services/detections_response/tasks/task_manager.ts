/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

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

/**
 * Result of a single {@link tryLaunchTask} attempt. Discriminated on `launched`
 * so that `runAt` is only present (and type-safe) when the forced run was
 * actually written.
 */
export type LaunchTaskAttempt =
  | { launched: true; runAt: Date; observedStatus: TaskStatus }
  | { launched: false; observedStatus: TaskStatus };

/**
 * Attempts to force `taskId` to run soon with a single, non-retrying write.
 *
 * Unlike {@link launchTask}, this skips the write when Task Manager is mid-claim
 * or running the task, to avoid clobbering an in-flight claim (which can silently
 * drop the forced `runAt`). It reports the outcome via a discriminated result so
 * the caller decides whether to retry or fail - e.g. by re-invoking inside a
 * `waitFor`/`retry` loop.
 */
export const tryLaunchTask = async (
  taskId: string,
  kbn: KbnClient,
  logger: ToolingLog,
  delayMillis: number = 1_000
): Promise<LaunchTaskAttempt> => {
  const task = await kbn.savedObjects.get({
    type: 'task',
    id: taskId,
  });

  const observedStatus = task.attributes.status as TaskStatus;

  if (observedStatus === TaskStatus.Claiming || observedStatus === TaskStatus.Running) {
    logger.info(`Task ${taskId} is ${observedStatus}; skipping forced launch`);
    return { launched: false, observedStatus };
  }

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

  return { launched: true, runAt: new Date(runAt), observedStatus };
};
