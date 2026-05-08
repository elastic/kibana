/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server/lib/errors';
import type { PostCompositeSloSummaryRefreshResponse } from '@kbn/slo-schema';
import type { SLORoutesDependencies } from '../../../routes/types';
import type { CompositeSloSummaryTaskState } from './types';
import { getCompositeSloSummaryTaskId } from './composite_slo_summary_task';

export const COOLDOWN_MS = 10 * 60 * 1000;

interface Dependencies {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  config: Pick<SLORoutesDependencies['config'], 'compositeSloSummaryTaskEnabled'>;
}

export async function refreshCompositeSloSummaries({
  taskManager,
  logger,
  config,
}: Dependencies): Promise<PostCompositeSloSummaryRefreshResponse> {
  if (!config.compositeSloSummaryTaskEnabled) {
    return { triggered: false, reason: 'task_disabled' };
  }

  const taskId = getCompositeSloSummaryTaskId();

  let task: Awaited<ReturnType<TaskManagerStartContract['get']>>;
  try {
    task = await taskManager.get(taskId);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return { triggered: false, reason: 'task_not_scheduled' };
    }
    logger.debug(`requestCompositeSloSummaryRefresh: failed to load task: ${String(error)}`);
    return { triggered: false, reason: 'run_soon_failed' };
  }

  const state = task.state as CompositeSloSummaryTaskState;
  if (isInCooldown(state)) {
    return { triggered: false, reason: 'cooldown' };
  }

  try {
    await taskManager.runSoon(taskId);
  } catch (error) {
    if (error instanceof TaskAlreadyRunningError) {
      return { triggered: false, reason: 'already_running' };
    }
    logger.debug(`requestCompositeSloSummaryRefresh: runSoon failed: ${String(error)}`);
    return { triggered: false, reason: 'run_soon_failed' };
  }

  try {
    // Write the cooldown timestamp after runSoon succeeds. There is an inherent race: the task
    // runner reads taskInstance.state at the start of its run and returns it verbatim, so if the
    // task starts and completes before bulkUpdateState persists this timestamp, the task's own
    // state write will overwrite it and the cooldown will not take effect for that cycle.
    // This is accepted as a best-effort cooldown — the worst case is one extra runSoon call.
    await taskManager.bulkUpdateState([taskId], (previousState) => ({
      ...previousState,
      lastCompositeListVisitRunSoonAt: Date.now(),
    }));
  } catch (error) {
    logger.debug(
      `requestCompositeSloSummaryRefresh: bulkUpdateState after runSoon failed: ${String(error)}`
    );
  }

  return { triggered: true };
}

function isInCooldown(taskState: CompositeSloSummaryTaskState): boolean {
  const lastAt = taskState.lastCompositeListVisitRunSoonAt;
  return typeof lastAt === 'number' && Date.now() - lastAt < COOLDOWN_MS;
}
