/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import moment from 'moment';
import { ENTITY_STORE_ESQL_VERSION } from './constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { EntityStoreESQLService } from '.';
import { getApiKeyManager } from '../auth/api_key';
import type { AppClientFactory } from '../../../../client';

const SCOPE = ['securitySolution'];
const INTERVAL = '10s';
const TIMEOUT = '10m';
const TASK_NAME = 'entity-store:esql:execute';

const getTaskId = (namespace: string): string =>
  `${TASK_NAME}:${namespace}:${ENTITY_STORE_ESQL_VERSION}`;

export const registerEntityStoreESQLExecuteTask = (
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  appClientFactory: AppClientFactory,
  logger: Logger,
  taskManager?: TaskManagerSetupContract
): void => {
  if (!taskManager) {
    logger.info(
      '[Entity Store ESQL] Task Manager is unavailable; skipping entity store esql executre.'
    );
    return;
  }

  taskManager.registerTaskDefinitions({
    [TASK_NAME]: {
      title: 'Entity Analytics Entity Store - Execute ESQL Cycle Execute Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        let cancelled = false;
        const isCancelled = () => cancelled;
        return {
          run: async () =>
            doRunEntityStoreCycle(
              taskInstance,
              getStartServices,
              appClientFactory,
              isCancelled,
              logger
            ),
          cancel: async () => {
            cancelled = true;
          },
        };
      },
    },
  });
};

const doRunEntityStoreCycle = async (
  taskInstance: ConcreteTaskInstance,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  appClientFactory: AppClientFactory,
  isCancelled: () => boolean,
  logger: Logger
): Promise<{
  state: LatestTaskStateSchema;
}> => {
  const state = taskInstance.state as LatestTaskStateSchema;
  const taskId = taskInstance.id;
  const log = entityStoreTaskLogFactory(logger, taskId);
  const namespace = state.namespace;

  log('Running cycle');

  const taskStartTime = moment().utc().toISOString();
  const updatedState = {
    lastExecutionTimestamp: taskStartTime,
    namespace,
    runs: state.runs + 1,
  };

  if (taskId !== getTaskId(namespace)) {
    log('outdated task; exiting');
    return { state: updatedState };
  }

  const [core, { dataViews, taskManager, security, encryptedSavedObjects }] =
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
    throw new Error(`[Entity Store] No API key found, skipping esql run in ${namespace} namespace`);
  }

  const { clusterClient, soClient } = await apiKeyManager.getClientFromApiKey(apiKey);
  const internalUserClient = core.elasticsearch.client.asInternalUser;
  const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, internalUserClient);
  const request = await apiKeyManager.getRequestFromApiKey(apiKey);
  const appClient = appClientFactory.create(request);

  const service = new EntityStoreESQLService(
    namespace,
    clusterClient.asCurrentUser,
    soClient,
    logger,
    dataViewsService,
    appClient,
    apiKeyManager,
    taskManager
  );

  const start = Date.now();
  log(`Executing cycle`);
  try {
    await service.runEntityStoreCycleForAllEntities();
    log(`Executed esql cycle execute in ${Date.now() - start}ms`);
  } catch (e) {
    log(`Error executing esql cycle execute: ${e.message}`);
  }

  const taskCompletionTime = moment().utc().toISOString();
  const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
  log(`Task run completed in ${taskDurationInSeconds} seconds`);

  return {
    state: updatedState,
  };
};

export const startEntityStoreESQLExecuteTask = async (
  namespace: string,
  taskManager: TaskManagerStartContract,
  logger: Logger
) => {
  const taskId = getTaskId(namespace);
  const log = entityStoreTaskLogFactory(logger, taskId);

  log('attempting to schedule');
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: TASK_NAME,
      scope: SCOPE,
      schedule: {
        interval: INTERVAL,
      },
      state: { ...defaultState, namespace },
      params: { version: ENTITY_STORE_ESQL_VERSION },
    });
  } catch (e) {
    logger.warn(`[Entity Store]  [task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
};

export const removeEntityStoreESQLExecuteTask = async (
  namespace: string,
  taskManager: TaskManagerStartContract,
  logger: Logger
) => {
  const taskId = getTaskId(namespace);
  const log = entityStoreTaskLogFactory(logger, taskId);
  try {
    await taskManager.remove(taskId);
    log(`Removed entity store ESQL runner namespace ${namespace}`);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(
        `[Entity Store ESQL] Failed to entity store ESQL runner namespace: ${err.message}`
      );
      throw err;
    }
  }
};

const entityStoreTaskLogFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[Entity Store ESQL] [task ${taskId}]: ${message}`);

const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      lastExecutionTimestamp: state.lastExecutionTimestamp || undefined,
      runs: state.runs || 0,
      namespace: typeof state.namespace === 'string' ? state.namespace : 'default',
    }),
    schema: schema.object({
      lastExecutionTimestamp: schema.maybe(schema.string()),
      namespace: schema.string(),
      runs: schema.number(),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

const defaultState: LatestTaskStateSchema = {
  lastExecutionTimestamp: undefined,
  namespace: 'default',
  runs: 0,
};
