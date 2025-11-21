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
import { runEntityStoreCycle } from './entity_store_esql_runner';
import type { EntityAnalyticsRoutesDeps } from '../../types';

const SCOPE = ['securitySolution'];
const INTERVAL = '10s';
const TIMEOUT = '10m';
const TASK_NAME = 'entity-store:esql:execute';

const getTaskId = (namespace: string): string =>
  `${TASK_NAME}:${namespace}:${ENTITY_STORE_ESQL_VERSION}`;

export const registerEntityStoreESQLExecuteTask = (
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
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
      title: 'Entity Analytics Entity Store - Execute Data View Refresh Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        let cancelled = false;
        const isCancelled = () => cancelled;
        return {
          run: async () =>
            doRunEntityStoreCycle(taskInstance, getStartServices, isCancelled, logger),
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
  isCancelled: () => boolean,
  logger: Logger
): Promise<{
  state: LatestTaskStateSchema;
}> => {
  const state = taskInstance.state as LatestTaskStateSchema;
  const taskId = taskInstance.id;
  const log = entityStoreTaskLogFactory(logger, taskId);

  log('Running cycle');

  const taskStartTime = moment().utc().toISOString();
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
  log(`Executing cycle`);
  try {
    await runEntityStoreCycle(state.namespace, log, isCancelled);
    log(`Executed data view refresh in ${Date.now() - start}ms`);
  } catch (e) {
    log(`Error executing data view refresh: ${e.message}`);
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
