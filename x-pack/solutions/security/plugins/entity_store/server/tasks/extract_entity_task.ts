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

function getTaskName(entityType: EntityType): string {
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
      run: async () => await run({ taskInstance, abortController, entityType, logger: taskLogger }),
    };
  };
}

async function run({
  taskInstance,
  abortController,
  entityType,
  logger,
}: {
  taskInstance: ConcreteTaskInstance;
  abortController: AbortController;
  entityType: EntityType;
  logger: Logger;
}): Promise<RunResult> {
  // Read the current state from the previous run (or default empty object)
  const currentState = taskInstance.state;
  const runs = currentState.runs || 0;
  // Extract the resources service from the task instance params
  const { resourcesService } = taskInstance.params as { resourcesService: ResourcesService };

  logger.info(
    `Running extract entity task, runs: ${runs}, resourcesService: ${resourcesService}, abortController: ${abortController}`
  );
  try {
    // TODO: Implement your entity extraction logic here
    // use resourcesService domain related operations
    // Update state with execution information
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
      const taskName = getTaskName(type);
      taskManager.registerTaskDefinitions({
        [taskName]: {
          title: config.title,
          timeout: config.timeout,
          createTaskRunner: createRunnerFactory(type, logger),
        },
      });
    });
  } catch (e) {
    logger.error(`Error registering tasks: ${e}`);
    throw e;
  }
}

export async function scheduleExtractEntityTasks({
  taskManager,
  logger,
  entityTypes,
  resourcesService,
  frequency,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  entityTypes: EntityType[];
  resourcesService: ResourcesService;
  frequency?: string;
}): Promise<void> {
  try {
    const config = TasksConfig[EntityStoreTaskType.Values.extractEntity];
    const interval = frequency || config.interval;
    for (const type of entityTypes) {
      const taskName = getTaskName(type);
      await taskManager.ensureScheduled({
        id: taskName,
        taskType: taskName,
        schedule: {
          interval,
        },
        params: { resourcesService },
        state: {},
      });
    }
  } catch (e) {
    logger.error(`Error scheduling task: ${e}`);
    throw e;
  }
}
