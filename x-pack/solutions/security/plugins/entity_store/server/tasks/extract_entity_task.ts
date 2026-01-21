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
import type { EntityStoreTaskConfig } from './config';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type * as types from '../types';
import type { EntityType } from '../domain/definitions/entity_schema';

function getTaskId(entityType: EntityType): string {
  const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
  return `${config.type}:${entityType}`;
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
  // const [coreStart, pluginsStart] = await core.getStartServices();
  // const esqlService = new ESQLService(logger, coreStart.elasticsearch.client.asInternalUser, abortController);

  try {
    const updatedState = {
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
    entityTypes.forEach((type) =>
      taskManager.registerTaskDefinitions({
        [getTaskId(type)]: {
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
      })
    );
  } catch (e) {
    logger.error(`Error registering extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function scheduleExtractEntityTask({
  logger,
  taskManager,
  task,
  type,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  task: EntityStoreTaskConfig;
  type: EntityType;
}): Promise<void> {
  try {
    const taskId = getTaskId(type);
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: taskId,
      schedule: { interval: task.interval },
      state: {},
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
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  type: EntityType;
}): Promise<void> {
  await taskManager.removeIfExists(getTaskId(type));
  logger.debug(`removed task: ${getTaskId(type)}`);
}
