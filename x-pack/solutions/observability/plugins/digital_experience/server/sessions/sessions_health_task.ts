/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getSessionsStatus } from './sessions_setup';

export const SESSIONS_HEALTH_TASK_TYPE = 'digital_experience:sessions-health';
export const SESSIONS_HEALTH_TASK_ID = 'digital_experience:sessions-health:1.0.0';
const SESSIONS_HEALTH_TASK_INTERVAL = '1h';

/**
 * Registers a task that only reports sessions transform health and version. It never
 * creates or updates the transform: doing that as the internal user would let the
 * transform read every source index regardless of the readers' privileges.
 */
export const registerSessionsHealthTask = ({
  core,
  logger,
  taskManager,
}: {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
}): void => {
  taskManager.registerTaskDefinitions({
    [SESSIONS_HEALTH_TASK_TYPE]: {
      title: 'Digital Experience sessions health check',
      description: 'Reports the health and version of the Digital Experience sessions transform.',
      timeout: '1m',
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ signal }) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const status = await getSessionsStatus(coreStart.elasticsearch.client.asInternalUser, {
            signal,
          });
          if (status.needsUpdate) {
            logger.warn(
              `Sessions transform is at version ${status.installedVersion}, expected ${status.currentVersion}. A user with the manage_digital_experience privilege must enable sessions again to update it.`
            );
          } else if (status.health === 'degraded') {
            logger.warn(
              `Sessions transform is unhealthy (state: ${status.state}): ${
                status.reason ?? 'unknown reason'
              }`
            );
          }
          return { state: {} };
        },
      }),
    },
  });
};

export const scheduleSessionsHealthTask = async ({
  logger,
  taskManager,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
}): Promise<void> => {
  try {
    await taskManager.ensureScheduled({
      id: SESSIONS_HEALTH_TASK_ID,
      taskType: SESSIONS_HEALTH_TASK_TYPE,
      schedule: { interval: SESSIONS_HEALTH_TASK_INTERVAL },
      params: {},
      state: {},
    });
  } catch (error) {
    logger.error(`Failed to schedule the sessions health task: ${error.message}`);
  }
};
