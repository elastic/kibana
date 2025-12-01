/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnalyticsServiceSetup,
  type Logger,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EntityType } from '../../../../../../common/api/entity_analytics/entity_store';
import { EngineComponentResourceEnum } from '../../../../../../common/api/entity_analytics/entity_store';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as EntityStoreHealthTaskState,
} from './state';
import { SCOPE, TIMEOUT, TYPE, VERSION, MAX_ATTEMPTS, SCHEDULE } from './constants';
import { entityStoreTaskLogMessageFactory } from '../utils';
import { ENTITY_STORE_HEALTH_REPORT_EVENT } from '../../../../telemetry/event_based/events';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { getApiKeyManager } from '../../auth/api_key';

function getTaskId(namespace: string): string {
  return `${TYPE}:${namespace}:${VERSION}`;
}

export function registerEntityStoreHealthTask({
  getStartServices,
  logger,
  telemetry,
  taskManager,
}: {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
}): void {
  if (!taskManager) {
    logger.warn(
      '[Entity Store]  Task Manager is unavailable; skipping Entity Store health task registration'
    );
    return;
  }

  type GetStoreSize = (index: string | string[]) => Promise<number>;
  const getStoreSize: GetStoreSize = async (index) => {
    const [coreStart] = await getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    const { count } = await esClient.count({ index });
    return count;
  };

  const getEnabledEntityTypesForNamespace = async (namespace: string) => {
    const [core, { security, encryptedSavedObjects }] = await getStartServices();

    const apiKeyManager = getApiKeyManager({
      core,
      logger,
      security,
      encryptedSavedObjects,
      namespace,
    });

    const apiKey = await apiKeyManager.getApiKey();

    if (!apiKey) {
      logger.info(
        `[Entity Store] No API key found, returning all entity types as enabled in ${namespace} namespace`
      );
      return getEnabledEntityTypes(true);
    }

    const { soClient } = await apiKeyManager.getClientFromApiKey(apiKey);

    const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);
    const genericEntityStoreEnabled = await uiSettingsClient.get<boolean>(
      SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING
    );

    return getEnabledEntityTypes(genericEntityStoreEnabled);
  };

  taskManager.registerTaskDefinitions({
    [TYPE]: {
      title: 'Entity Store health task',
      description: `Sends telemetry events on Entity Store health every 1h`,
      timeout: TIMEOUT,
      maxAttempts: MAX_ATTEMPTS,
      stateSchemaByVersion,
      createTaskRunner: (context: RunContext) => {
        return {
          async run() {
            return runHealthTask({
              logger,
              telemetry,
              context,
              getStartServices,
            });
          },
          async cancel() {
            logger.warn(`[Entity Store]  Task ${TYPE} timed out`);
          },
        };
      },
    },
  });
}

export async function startEntityStoreHealthTask({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  entityType: EntityType;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace);
  const msg = entityStoreTaskLogMessageFactory(taskId);

  logger.info(msg('attempting to schedule'));
  try {
    const task = await taskManager.ensureScheduled({
      id: taskId,
      taskType: TYPE,
      scope: SCOPE,
      schedule: SCHEDULE,
      state: { ...defaultState, namespace },
      params: {
        version: VERSION,
        namespace,
      },
    });
    logger.info(msg(`scheduled with ${JSON.stringify(task.schedule)}`));
  } catch (e) {
    logger.error(msg(`error scheduling task, received ${e.message}`));
    throw e;
  }
}

export async function removeEntityStoreHealthTask({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  entityType: EntityType;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace);
  const msg = entityStoreTaskLogMessageFactory(taskId);
  try {
    await taskManager.remove(getTaskId(namespace));
    logger.info(msg(`removed health task`));
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(msg(`failed to remove health task: ${err.message}`));
      throw err;
    }
  }
}

export async function runHealthTask({
  logger,
  telemetry,
  context,
  getStartServices,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  context: RunContext;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
}): Promise<{
  state: EntityStoreHealthTaskState;
}> {
  const state = context.taskInstance.state as EntityStoreHealthTaskState;
  const taskId: string = context.taskInstance.id;
  const msg = entityStoreTaskLogMessageFactory(taskId);
  try {
    const statusResponse = await entityStoreStatusHandler({ include_components: true });
    statusResponse.engines.forEach((engine) => {
      telemetry.reportEvent(ENTITY_STORE_HEALTH_REPORT_EVENT.eventType, engine);
    });
    return { state };
  } catch (e) {
    logger.error(msg(`error running task, received ${e.message}`));
    throw e;
  }
}

export async function getEntityStoreHealthTaskState({
  namespace,
  taskManager,
}: {
  namespace: string;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace);
  try {
    const taskState = await taskManager.get(taskId);

    return {
      id: taskState.id,
      resource: EngineComponentResourceEnum.task,
      installed: true,
      enabled: taskState.enabled,
      status: taskState.status,
      retryAttempts: taskState.attempts,
      nextRun: taskState.runAt,
      lastRun: taskState.state.lastExecutionTimestamp,
      runs: taskState.state.runs,
    };
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return {
        id: taskId,
        installed: false,
        resource: EngineComponentResourceEnum.task,
      };
    }
    throw e;
  }
}
