/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SessionsSettings, SessionsStatus } from '../../common/sessions';
import { getSessionsStatus } from './sessions_setup';

export const SESSIONS_HEALTH_TASK_TYPE = 'digital_experience:sessions-health';
export const SESSIONS_HEALTH_TASK_ID = 'digital_experience:sessions-health:1.0.0';
const SESSIONS_HEALTH_TASK_INTERVAL = '5m';

/** What the last run found, so a run only logs what changed since. */
const stateSchemaV1 = schema.object({
  health: schema.maybe(schema.string()),
  needsUpdate: schema.maybe(schema.boolean()),
  newerVersion: schema.maybe(schema.boolean()),
});
type SessionsHealthTaskState = TypeOf<typeof stateSchemaV1>;

const isProblem = (health: string | undefined): boolean =>
  health === 'degraded' || health === 'lagging';

/** Logs the changes in health, needed update and newer installed version since `previous`. */
const logHealthChanges = (
  logger: Logger,
  status: SessionsStatus,
  previous: SessionsHealthTaskState
): SessionsHealthTaskState => {
  const newerVersion =
    status.installedVersion != null && status.installedVersion > status.currentVersion;
  if (isProblem(status.health) && status.health !== previous.health) {
    logger.warn(
      `Sessions transforms are ${status.health} (state: ${status.state}): ${
        status.reason ?? 'unknown reason'
      }`
    );
  } else if (isProblem(previous.health) && !isProblem(status.health)) {
    logger.info(`Sessions transforms are no longer ${previous.health}.`);
  }
  if (status.needsUpdate && previous.needsUpdate !== true) {
    logger.warn(
      `${status.reason} A user with the Digital Experience "Set up and update session summaries" privilege must enable sessions again.`
    );
  }
  if (newerVersion && previous.newerVersion !== true) {
    logger.warn(`${status.reason}`);
  }
  return { health: status.health, needsUpdate: status.needsUpdate, newerVersion };
};

/**
 * Registers a task that only reports sessions transform health, version and lag. It never
 * creates or updates a transform: any transform update re-stamps the transform with the
 * updater's privileges, and doing that as the internal user would let it read every source
 * index regardless of the readers' privileges.
 */
export const registerSessionsHealthTask = ({
  core,
  logger,
  taskManager,
  settings,
}: {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  settings: SessionsSettings;
}): void => {
  taskManager.registerTaskDefinitions({
    [SESSIONS_HEALTH_TASK_TYPE]: {
      title: 'Digital Experience sessions health check',
      description:
        'Reports the health, version and lag of the Digital Experience sessions transforms.',
      timeout: '1m',
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      priority: TaskPriority.Maintenance,
      stateSchemaByVersion: { 1: { schema: stateSchemaV1, up: (state) => state } },
      createTaskRunner: ({ taskInstance, signal }) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const status = await getSessionsStatus(coreStart.elasticsearch.client.asInternalUser, {
            settings,
            signal,
          });
          const previous = taskInstance.state as SessionsHealthTaskState;
          return { state: logHealthChanges(logger, status, previous) };
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
