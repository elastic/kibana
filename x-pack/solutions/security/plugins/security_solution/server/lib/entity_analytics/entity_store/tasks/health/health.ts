/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  type Logger,
  type AnalyticsServiceSetup,
  type AuditLogger,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
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
  type LatestTaskStateSchema as EntityStoreHealthTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

import { ENTITY_STORE_HEALTH_REPORT_EVENT } from '../../../../telemetry/event_based/events';
import { entityStoreTaskDebugLogFactory, entityStoreTaskLogFactory } from '../utils';
import type { AppClientFactory } from '../../../../../client';
import type { GetEntityStoreStatusResponse } from '../../../../../../common/api/entity_analytics/entity_store/status.gen';

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

export const registerEntityStoreHealthTask = ({
  getStartServices,
  logger,
  telemetry,
  appClientFactory,
  taskManager,
  auditLogger,
  entityStoreConfig,
  experimentalFeatures,
  kibanaVersion,
  isServerless,
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
  isServerless: boolean;
}): void => {
  if (!taskManager) {
    logger.info('[Entity Store] Task Manager is unavailable; skipping entity store health task.');
    return;
  }

  const getStatus = async (namespace: string): Promise<void> => {
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
        `[Entity Store] No API key found, skipping health reporting in ${namespace} namespace`
      );
      return;
    }

    const { clusterClient, soClient } = await apiKeyManager.getClientFromApiKey(apiKey);

    const internalUserClient = core.elasticsearch.client.asInternalUser;

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, internalUserClient);

    const request = await apiKeyManager.getRequestFromApiKey(apiKey);

    const appClient = appClientFactory.create(request);

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
      security,
      request,
      uiSettingsClient: core.uiSettings.asScopedToClient(soClient),
      isServerless,
    });

    const statusResponse = await entityStoreClient.status({ include_components: true });
    telemetry.reportEvent(
      ENTITY_STORE_HEALTH_REPORT_EVENT.eventType,
      extractEngineHealthInformation(statusResponse)
    );
  };

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Store - Execute Health Checks Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createEntityStoreHealthTaskRunnerFactory({
        logger,
        telemetry,
        getStatus,
        experimentalFeatures,
      }),
    },
  });
};

export const startEntityStoreHealthTask = async ({
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

export const removeEntityStoreHealthTask = async ({
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
    logger.info(`[Entity Store] Removed entity store health task for namespace ${namespace}`);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`[Entity Store] Failed to remove entity store health task: ${err.message}`);
      throw err;
    }
  }
};

export const runEntityStoreHealthTask = async ({
  getStatus,
  logger,
  taskInstance,
  telemetry,
  experimentalFeatures,
}: {
  logger: Logger;
  getStatus: (namespace: string) => Promise<void>;
  taskInstance: ConcreteTaskInstance;
  telemetry: AnalyticsServiceSetup;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<{
  state: EntityStoreHealthTaskState;
}> => {
  const state = taskInstance.state as EntityStoreHealthTaskState;
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
    debugLog(`Executing status retrieval`);
    try {
      await getStatus(state.namespace);
      log(`Executed status retrieval in ${Date.now() - start}ms`);
    } catch (e) {
      log(`Error getting status: ${e.message}`);
    }

    const taskCompletionTime = moment().utc().toISOString();
    const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
    log(`Task run completed in ${taskDurationInSeconds} seconds`);

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(`[Entity Store] [task ${taskId}]: error running task, received ${e.message}`);
    throw e;
  }
};

const createEntityStoreHealthTaskRunnerFactory =
  ({
    logger,
    telemetry,
    getStatus,
    experimentalFeatures,
  }: {
    logger: Logger;
    telemetry: AnalyticsServiceSetup;
    getStatus: (namespace: string) => Promise<void>;
    experimentalFeatures: ExperimentalFeatures;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    return {
      run: async () =>
        runEntityStoreHealthTask({
          getStatus,
          logger,
          taskInstance,
          telemetry,
          experimentalFeatures,
        }),
      cancel: async () => {
        logger.warn(`[Entity Store]  Task ${TYPE} timed out`);
      },
    };
  };

export const getEntityStoreHealthTaskState = async ({
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

function extractEngineHealthInformation(statusResponse: GetEntityStoreStatusResponse): Event {
  const unpacked: Event = {
    engines: [],
  };
  statusResponse.engines.forEach((engine) => {
    unpacked.engines.push({
      type: engine.type as string,
      status: engine.status,
      delay: engine.delay,
      frequency: engine.frequency,
      docsPerSecond: engine.docsPerSecond,
      lookbackPeriod: engine.lookbackPeriod,
      fieldHistoryLength: engine.fieldHistoryLength,
      indexPattern: engine.indexPattern,
      filter: engine.filter,
      timestampField: engine.timestampField,
      components: (engine.components || []).map((c) => ({
        id: c.id,
        resource: c.resource,
        installed: c.installed,
        health: c.health,
      })),
    } as Engine);
  });
  return unpacked;
}

interface Component {
  id: string;
  resource: string;
  installed: boolean;
  health?: string;
  enabled?: boolean;
  status?: string;
  lastRun?: string;
  nextRun?: string;
}

interface Engine {
  type: string;
  status: string;
  delay: string;
  frequency: string;
  docsPerSecond: number;
  lookbackPeriod: string;
  fieldHistoryLength: number;
  indexPattern: string;
  filter: string;
  timestampField: string;
  components: Component[];
}

interface Event {
  engines: Engine[];
}
