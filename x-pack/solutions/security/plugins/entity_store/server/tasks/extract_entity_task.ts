/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type * as types from '../types';
import type { EntityType } from '../domain/definitions/entity_schema';

function getTaskType(entityType: EntityType): string {
  const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
  return `${config.type}:${entityType}`;
}

function getTaskId(entityType: EntityType, namespace: string): string {
  return `${getTaskType(entityType)}:${namespace}`;
}

async function runTask({
  taskInstance,
  abortController,
  entityType,
  logger,
  core,
}: RunContext & {
  entityType: EntityType;
  logger: Logger;
  core: types.EntityStoreCoreSetup;
}): Promise<RunResult> {
  logger.info(`Running extract entity task`);

  const currentState = taskInstance.state;
  const runs = currentState.runs || 0;
  const namespace = currentState.namespace;
  // const [coreStart, pluginsStart] = await core.getStartServices();
  // const esqlService = new ESQLService(logger, coreStart.elasticsearch.client.asInternalUser, abortController);

  try {
    const updatedState = {
      namespace,
      lastExecutionTimestamp: new Date().toISOString(),
      runs: runs + 1,
      entityType,
    };

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(`Error running task, received ${e.message}`);
    return {
      state: {
        ...currentState,
        lastError: e.message,
        lastErrorTimestamp: new Date().toISOString(),
        status: 'error',
      },
    };
  }
}

export function registerExtractEntityTasks({
  taskManager,
  logger,
  entityTypes,
  core,
}: {
  core: types.EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  entityTypes: EntityType[];
}): void {
  try {
    const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
    entityTypes.forEach((type) => {
      const taskType = getTaskType(type);
      taskManager.registerTaskDefinitions({
        [taskType]: {
          title: config.title,
          timeout: config.timeout,
          createTaskRunner: ({ taskInstance, abortController }) => ({
            run: () =>
              runTask({
                taskInstance,
                abortController,
                logger: logger.get(taskInstance.id),
                core,
                entityType: type,
              }),
          }),
        },
      });
    });
  } catch (e) {
    logger.error(`Error registering extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function scheduleExtractEntityTask({
  logger,
  taskManager,
  frequency,
  type,
  namespace,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  type: EntityType;
  frequency?: string;
  namespace: string;
}): Promise<void> {
  try {
    const taskType = getTaskType(type);
    const taskId = getTaskId(type, namespace);
    const interval = frequency || TasksConfig[EntityStoreTaskType.Values.extractEntity].interval;
    await taskManager.ensureScheduled({
      id: taskId,
      taskType,
      schedule: { interval },
      state: { namespace },
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function stopExtractEntityTask({
  taskManager,
  logger,
  type,
  namespace,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  type: EntityType;
  namespace: string;
}): Promise<void> {
  const taskId = getTaskId(type, namespace);
  await taskManager.removeIfExists(taskId);
  logger.debug(`removed task: ${taskId}`);
}
