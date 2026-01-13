/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunResult, TaskRunCreatorFunction } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { EntityType } from '../domain/definitions/entity_type';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type { ResourcesService } from '../domain/resources_service';

interface ExtractEntityTaskParams {
  resourcesService: ResourcesService;
}

interface ExtractEntityTaskBaseState {
  runs: number;
  lastExecutionTimestamp: string;
  entityType: EntityType;
}

interface ExtractEntityTaskSuccessState extends ExtractEntityTaskBaseState {
  status: 'success';
}

interface ExtractEntityTaskErrorState extends ExtractEntityTaskBaseState {
  status: 'error';
  lastError: string;
  lastErrorTimestamp: string;
}

type ExtractEntityTaskState = ExtractEntityTaskSuccessState | ExtractEntityTaskErrorState;

interface ExtractEntityTaskInstance extends Omit<ConcreteTaskInstance, 'params' | 'state'> {
  params: ExtractEntityTaskParams;
  state: ExtractEntityTaskState;
}

function getTaskId(entityType: EntityType): string {
  const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
  return `${config.type}:${entityType}`;
}

function createRunnerFactory(entityType: EntityType, logger: Logger): TaskRunCreatorFunction {
  return ({
    taskInstance,
    abortController,
  }: {
    taskInstance: ConcreteTaskInstance;
    abortController: AbortController;
  }) => {
    const taskLogger = logger.get(taskInstance.id);
    return {
      run: async () =>
        await run({
          taskInstance: taskInstance as ExtractEntityTaskInstance,
          abortController,
          entityType,
          logger: taskLogger,
        }),
    };
  };
}

async function run({
  taskInstance,
  abortController,
  entityType,
  logger,
}: {
  taskInstance: ExtractEntityTaskInstance;
  abortController: AbortController;
  entityType: EntityType;
  logger: Logger;
}): Promise<RunResult> {
  const currentState = taskInstance.state;
  const runs = currentState.runs || 0;
  const { resourcesService } = taskInstance.params;

  logger.info(
    `Running extract entity task, runs: ${runs}, resourcesService: ${resourcesService}, abortController: ${abortController}`
  );
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
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  entityTypes: EntityType[];
}): void {
  try {
    const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
    entityTypes.forEach((type) => {
      const taskId = getTaskId(type);
      taskManager.registerTaskDefinitions({
        [taskId]: {
          title: config.title,
          timeout: config.timeout,
          createTaskRunner: createRunnerFactory(type, logger),
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
  resourcesService,
  logger,
  frequency,
}: {
  taskManager: TaskManagerStartContract;
  entityTypes: EntityType[];
  resourcesService: ResourcesService;
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
        params: { resourcesService },
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
