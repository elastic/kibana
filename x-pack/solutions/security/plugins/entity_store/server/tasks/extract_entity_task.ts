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
import type { EntityStoreCoreSetup } from '../types';
import type { EntityType } from '../domain/definitions/registry';

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
}: {
  entityType: EntityType;
  logger: Logger;
  core: EntityStoreCoreSetup;
} & RunContext): Promise<RunResult> {
  const currentState = taskInstance.state;
  const runs = currentState.runs || 0;

  // const [coreStart, pluginsStart] = await core.getStartServices();
  // const esqlService = new ESQLService(logger, coreStart.elasticsearch.client.asInternalUser, abortController);

  try {
    const updatedState = {
      lastExecutionTimestamp: new Date().toISOString(),
      runs: runs + 1,
      entityType,
      status: 'success',
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
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  entityTypes: EntityType[];
  core: EntityStoreCoreSetup;
}): void {
  try {
    const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
    entityTypes.forEach((type) => {
      const taskId = getTaskId(type);
      taskManager.registerTaskDefinitions({
        [taskId]: {
          title: config.title,
          timeout: config.timeout,
          createTaskRunner: ({ taskInstance, abortController }: RunContext) => ({
            run: () =>
              runTask({
                taskInstance,
                abortController,
                entityType: type,
                logger: logger.get(taskInstance.id),
                core,
              }),
          }),
          stateSchemaByVersion: {},
        },
      });
    });
  } catch (e) {
    logger.error(`Error registering extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function scheduleExtractEntityTasks({
  taskManager,
  entityTypes,
  logger,
  frequency,
}: {
  taskManager: TaskManagerStartContract;
  entityTypes: EntityType[];
  logger: Logger;
  frequency?: string;
}): Promise<void> {
  try {
    const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
    const interval = frequency || config.interval;
    for (const type of entityTypes) {
      const taskId = getTaskId(type);
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: taskId,
        schedule: {
          interval,
        },
        params: {},
        state: {},
      });
    }
  } catch (e) {
    logger.error(`Error scheduling extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function stopExtractEntityTasks({
  taskManager,
  logger,
  entityTypes,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  entityTypes: EntityType[];
}): Promise<string[]> {
  const taskIds = entityTypes.map((entityType) => getTaskId(entityType));

  const { statuses } = await taskManager.bulkRemove(taskIds);
  const stoppedTasksIds = statuses.filter((status) => status.success).map((status) => status.id);
  logger.debug(`Successfully stopped ${stoppedTasksIds.length} task(s)`);

  return stoppedTasksIds;
}
