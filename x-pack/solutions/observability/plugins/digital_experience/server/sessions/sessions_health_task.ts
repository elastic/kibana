/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SessionsSettings, SessionsStatus } from '../../common/sessions';
import { describeError } from '../lib/helpers/errors';
import type { SessionsApiKeys } from './sessions_api_key';
import type { SessionsAutoUpdateState } from './sessions_auto_update';
import { getApiKeyStatus, updateSessionsWithApiKey } from './sessions_auto_update';
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
/**
 * Adds the last automatic update failure, so a run only logs a new one, and the stored key found
 * invalidated, so it isn't authenticated with again and users who can't check it see it too.
 */
const stateSchemaV2 = stateSchemaV1.extends({
  autoUpdateError: schema.maybe(schema.string()),
  invalidApiKeyId: schema.maybe(schema.string()),
});
type SessionsHealthTaskState = TypeOf<typeof stateSchemaV2>;

const isProblem = (health: string | undefined): boolean =>
  health === 'degraded' || health === 'lagging';

/** Logs the changes in health, needed update and newer installed version since `previous`. */
const logHealthChanges = (
  logger: Logger,
  status: SessionsStatus,
  keyId: string | null,
  previous: SessionsHealthTaskState
): SessionsHealthTaskState => {
  const invalidApiKeyId = status.apiKeyInvalid && keyId ? keyId : undefined;
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
  if (invalidApiKeyId && invalidApiKeyId !== previous.invalidApiKeyId) {
    logger.warn(
      'The stored API key Kibana updates the sessions transforms with was invalidated or has expired. Sessions keep updating, but upgrades and settings changes no longer apply automatically until a user with the Digital Experience "Set up and update session summaries" privilege opens the Sessions tab, which grants a new key.'
    );
  }
  if (status.needsUpdate && previous.needsUpdate !== true) {
    logger.warn(
      `${status.reason} A user with the Digital Experience "Set up and update session summaries" privilege must enable sessions again.`
    );
  }
  if (newerVersion && previous.newerVersion !== true) {
    logger.warn(`${status.reason}`);
  }
  return {
    health: status.health,
    needsUpdate: status.needsUpdate,
    newerVersion,
    invalidApiKeyId,
  };
};

/**
 * Registers a task that reports sessions transform health, version and lag, and applies a needed
 * update when the transforms run with a stored API key, using that same key. It never updates a
 * transform otherwise: any transform update re-stamps the transform with the updater's
 * privileges, and doing that as the internal user would let it read every source index
 * regardless of the readers' privileges.
 */
export const registerSessionsHealthTask = ({
  core,
  logger,
  taskManager,
  settings,
  apiKeys,
}: {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  settings: SessionsSettings;
  apiKeys: SessionsApiKeys;
}): void => {
  taskManager.registerTaskDefinitions({
    [SESSIONS_HEALTH_TASK_TYPE]: {
      title: 'Digital Experience sessions health check',
      description:
        'Reports the health, version and lag of the Digital Experience sessions transforms, and updates them with their stored API key.',
      // Long enough for an update, which waits up to 30s for a rebuilt sessions index.
      timeout: '2m',
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      priority: TaskPriority.Maintenance,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (state) => state },
        2: { schema: stateSchemaV2, up: (state) => state },
      },
      createTaskRunner: ({ taskInstance, signal }) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const previous = taskInstance.state as SessionsHealthTaskState;
          const readStatus = async () =>
            getApiKeyStatus(
              await getSessionsStatus(coreStart.elasticsearch.client.asInternalUser, {
                settings,
                signal,
              }),
              apiKeys,
              {
                checkKey: true,
                logger,
                getAutoUpdateState: async () => ({ invalidApiKeyId: previous.invalidApiKeyId }),
              }
            );

          let { status, keyId } = await readStatus();
          let autoUpdateError: string | undefined;
          if (status.autoUpdate) {
            try {
              const updated = await updateSessionsWithApiKey({
                status,
                apiKeys,
                logger,
                audit: coreStart.security.audit.withoutRequest,
                settings,
              });
              if (updated) {
                logger.info(
                  status.needsUpdate
                    ? `Updated the sessions transforms to version ${status.currentVersion} and the configured settings with their stored API key.`
                    : 'Moved the sessions transforms to their stored API key.'
                );
                ({ status, keyId } = await readStatus());
              }
            } catch (error) {
              autoUpdateError = describeError(error);
              if (autoUpdateError !== previous.autoUpdateError) {
                logger.error(
                  `Could not update the sessions transforms with their stored API key: ${autoUpdateError}`
                );
              }
            }
          }
          return {
            state: { ...logHealthChanges(logger, status, keyId, previous), autoUpdateError },
          };
        },
      }),
    },
  });
};

/**
 * What the health task's last run found about automatic updates. Empty when it can't be read, as
 * that only affects what the status shows.
 */
export const getLastAutoUpdateState = async (
  taskManager: TaskManagerStartContract,
  logger: Logger
): Promise<SessionsAutoUpdateState> => {
  try {
    const { state } = await taskManager.get(SESSIONS_HEALTH_TASK_ID);
    const { autoUpdateError, invalidApiKeyId } = state as SessionsHealthTaskState;
    return { autoUpdateError, invalidApiKeyId };
  } catch (error) {
    // Not scheduled yet, so it hasn't found anything either.
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      logger.warn(`Could not read the sessions health task: ${describeError(error)}`);
    }
    return {};
  }
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
