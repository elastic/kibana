/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AnalyticsServiceSetup, AuditLogger } from '@kbn/core/server';
import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EntityStoreConfig } from '../../types';
import { EntityStoreDataClient } from '../../entity_store_data_client';
import { getApiKeyManager } from '../../auth/api_key';
import type { ExperimentalFeatures } from '../../../../../../common';
import { EngineComponentResourceEnum } from '../../../../../../common/api/entity_analytics/entity_store';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as EntityStoreDataViewRefreshTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

import { ENTITY_STORE_DATA_VIEW_REFRESH_EXECUTION_EVENT } from '../../../../telemetry/event_based/events';
import { entityStoreTaskDebugLogFactory, entityStoreTaskLogFactory } from '../utils';
import type { AppClientFactory } from '../../../../../client';

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

export const registerEntityStoreDataViewRefreshTask = ({
  getStartServices,
  logger,
  telemetry,
  appClientFactory,
  taskManager,
  auditLogger,
  entityStoreConfig,
  experimentalFeatures,
  kibanaVersion,
}: {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  appClientFactory: AppClientFactory;
  taskManager?: TaskManagerSetupContract;
  auditLogger?: AuditLogger;
  entityStoreConfig: EntityStoreConfig;
  experimentalFeatures: ExperimentalFeatures;
  kibanaVersion: string;
}): void => {
  if (!taskManager) {
    logger.info(
      '[Entity Store] Task Manager is unavailable; skipping entity store data view refresh.'
    );
    return;
  }

  const refreshDataViews = async (namespace: string): Promise<void> => {
    const [core, { dataViews, taskManager: taskManagerStart, security, encryptedSavedObjects }] =
      await getStartServices();

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
        `[Entity Store] No API key found, skipping data view refresh in ${namespace} namespace`
      );
      return;
    }

    const { clusterClient, soClient } = await apiKeyManager.getClientFromApiKey(apiKey);

    const internalUserClient = core.elasticsearch.client.asInternalUser;

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, internalUserClient);

    const appClient = appClientFactory.create(await apiKeyManager.getRequestFromApiKey(apiKey));

    const entityStoreClient: EntityStoreDataClient = new EntityStoreDataClient({
      namespace,
      clusterClient,
      soClient,
      logger,
      appClient,
      taskManager: taskManagerStart,
      experimentalFeatures,
      auditLogger,
      telemetry,
      kibanaVersion,
      dataViewsService,
      config: entityStoreConfig,
    });

    await entityStoreClient.applyDataViewIndices();
  };

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Entity Store - Execute Data View Refresh Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createEntityStoreDataViewRefreshTaskRunnerFactory({
        logger,
        telemetry,
        refreshDataViews,
        experimentalFeatures,
      }),
    },
  });
};

export const startEntityStoreDataViewRefreshTask = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  const taskId = getTaskId(namespace);
  const log = entityStoreTaskLogFactory(logger, taskId);

  log('attempting to schedule');
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: getTaskName(),
      scope: SCOPE,
      schedule: {
        interval: INTERVAL,
      },
      state: { ...defaultState, namespace },
      params: { version: VERSION },
    });
  } catch (e) {
    logger.warn(`[Entity Store]  [task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
};

export const removeEntityStoreDataViewRefreshTask = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  try {
    await taskManager.remove(getTaskId(namespace));
    logger.info(
      `[Entity Store] Removed entity store data view refresh task for namespace ${namespace}`
    );
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(
        `[Entity Store] Failed to remove entity store data view refresh task: ${err.message}`
      );
      throw err;
    }
  }
};

export const runEntityStoreDataViewRefreshTask = async ({
  refreshDataViews,
  isCancelled,
  logger,
  taskInstance,
  telemetry,
  experimentalFeatures,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  refreshDataViews: (namespace: string) => Promise<void>;
  taskInstance: ConcreteTaskInstance;
  telemetry: AnalyticsServiceSetup;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<{
  state: EntityStoreDataViewRefreshTaskState;
}> => {
  const state = taskInstance.state as EntityStoreDataViewRefreshTaskState;
  const taskId = taskInstance.id;
  const log = entityStoreTaskLogFactory(logger, taskId);
  const debugLog = entityStoreTaskDebugLogFactory(logger, taskId);
  try {
    const taskStartTime = moment().utc().toISOString();
    log('running task');

    const updatedState = {
      lastExecutionTimestamp: taskStartTime,
      namespace: state.namespace,
      runs: state.runs + 1,
    };

    if (taskId !== getTaskId(state.namespace)) {
      log('outdated task; exiting');
      return { state: updatedState };
    }

    const start = Date.now();
    debugLog(`Executing data view refresh`);
    try {
      await refreshDataViews(state.namespace);
      log(`Executed data view refresh in ${Date.now() - start}ms`);
    } catch (e) {
      log(`Error executing data view refresh: ${e.message}`);
    }

    const taskCompletionTime = moment().utc().toISOString();
    const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
    log(`Task run completed in ${taskDurationInSeconds} seconds`);

    telemetry.reportEvent(ENTITY_STORE_DATA_VIEW_REFRESH_EXECUTION_EVENT.eventType, {
      duration: taskDurationInSeconds,
      interval: INTERVAL,
    });

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(`[Entity Store] [task ${taskId}]: error running task, received ${e.message}`);
    throw e;
  }
};

const createEntityStoreDataViewRefreshTaskRunnerFactory =
  ({
    logger,
    telemetry,
    refreshDataViews,
    experimentalFeatures,
  }: {
    logger: Logger;
    telemetry: AnalyticsServiceSetup;
    refreshDataViews: (namespace: string) => Promise<void>;
    experimentalFeatures: ExperimentalFeatures;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runEntityStoreDataViewRefreshTask({
          refreshDataViews,
          isCancelled,
          logger,
          taskInstance,
          telemetry,
          experimentalFeatures,
        }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };

export const getEntityStoreDataViewRefreshTaskState = async ({
  namespace,
  taskManager,
}: {
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
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
};
