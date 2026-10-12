/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import {
  EXECUTIVE_BRIEF_CLEANUP_TASK_ID,
  EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefStore } from '../store/brief_store';

/** Registers the daily retention cleanup. Call in plugin setup when the flag is on. */
export const registerCleanupBriefsTask = ({
  taskManager,
  getBriefStore,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  getBriefStore: () => Promise<BriefStore>;
  logger: Logger;
}): void => {
  taskManager.registerTaskDefinitions({
    [EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE]: {
      title: 'Entity Analytics: executive brief retention cleanup',
      description: 'Deletes executive briefs past their expiry date.',
      // A single delete-by-query over a small index (one document per user and space).
      timeout: '5m',
      cost: TaskCost.Tiny,
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          try {
            const store = await getBriefStore();
            const deleted = await store.deleteExpired({ abortSignal: signal });
            logger.debug(`Executive brief cleanup deleted ${deleted} expired brief(s)`);
          } catch (error) {
            logger.error(`Executive brief cleanup failed: ${error.message}`);
          }
          return { state: {} };
        },
      }),
    },
  });
};

/** Ensures the daily cleanup is scheduled. Call in plugin start when the flag is on. */
export const scheduleCleanupBriefsTask = async (
  taskManager: TaskManagerStartContract
): Promise<void> => {
  await taskManager.ensureScheduled({
    id: EXECUTIVE_BRIEF_CLEANUP_TASK_ID,
    taskType: EXECUTIVE_BRIEF_CLEANUP_TASK_TYPE,
    schedule: { interval: '1d' },
    state: {},
    params: {},
  });
};
