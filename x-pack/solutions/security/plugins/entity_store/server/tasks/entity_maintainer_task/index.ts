/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { EntityMaintainerStatus, RegisterEntityMaintainerConfig } from './types';
import { TasksConfig } from "../config";
import { EntityStoreTaskType } from "../constants";
import type { Logger } from '@kbn/logging';
import { EntityStoreCoreSetup } from '../../types';
import {
  EntityMaintainersTasksClient,
  EntityMaintainersTasksTypeName,
} from '../../domain/definitions/saved_objects';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';

function getTaskType(id: string): string {
  return `${TasksConfig[EntityStoreTaskType.Values.entityMaintainer].type}:${id}`;
}

function getTaskId(id: string, namespace: string): string {
  return `${id}:${namespace}`;
}

export async function scheduleEntityMaintainerTasks({
  logger,
  taskManager,
  namespace,
  request,
  entityMaintainersTasksClient,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  request: KibanaRequest;
  entityMaintainersTasksClient: EntityMaintainersTasksClient;
}): Promise<void> {
  try {
    logger.debug(`Scheduling entity maintainer tasks`);
    const tasks = await entityMaintainersTasksClient.getAll();
    logger.debug(`Tasks: ${JSON.stringify(tasks)}`);
    for (const { id, interval } of tasks) {
      await taskManager.ensureScheduled(
        {
          id: getTaskId(id, namespace),
          taskType: getTaskType(id),
          schedule: { interval },
          state: {},
          params: {},
        },
        { request }
      );
    }
  } catch (err) {
    logger.error(`Failed to schedule entity maintainer tasks: ${(err as Error).message}`);
    throw err;
  }
}

export function registerEntityMaintainerTask({
  taskManager,
  logger,
  config,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: RegisterEntityMaintainerConfig;
  core: EntityStoreCoreSetup;
}): void {
  try {
    logger.debug(`Registering entity maintainer task: ${config.id}`);
    const { title } = TasksConfig[EntityStoreTaskType.Values.entityMaintainer];
    const { run, interval, initialState, description, id, setup } = config;
    const type = getTaskType(id);

    core.getStartServices()
      .then(([start]) => {
        const internalRepo = start.savedObjects.createInternalRepository([
          EntityMaintainersTasksTypeName,
        ]);
        const maintainerTasksClient = new EntityMaintainersTasksClient(internalRepo, logger);
        maintainerTasksClient.addOrUpdate({ id, interval }).catch((err: Error) => {
          logger.error(`Failed to register entity maintainer task in saved object: ${err.message}`);
        });
      });

    taskManager.registerTaskDefinitions({
      [type]: {
        title: title,
        description,
        createTaskRunner: ({ taskInstance, abortController, fakeRequest }) => ({
          run: async () => {
            const currentStatus = taskInstance.state;

            if (!fakeRequest) {
              logger.error(`Entity maintainer task [${id}]: no fake request found, skipping run`);
              return {
                state: currentStatus,
              };
            }

            const maintainerStatus: EntityMaintainerStatus = {
              metadata: {
                runs: currentStatus?.metadata?.runs || 0,
                lastSuccessTimestamp: currentStatus?.metadata?.lastSuccessTimestamp || null,
                lastErrorTimestamp: currentStatus?.metadata?.lastErrorTimestamp || null,
              },
              state: currentStatus?.metadata?.runs ? currentStatus.state : initialState,
            };

            try {
              const isFirstRun = maintainerStatus.metadata.runs === 0;
              if (isFirstRun && setup) {
                logger.debug(`Entity maintainer task [${id}]: first run, executing setup`);
                maintainerStatus.state = await setup({ status: maintainerStatus, abortController, logger, fakeRequest });
              }
              logger.debug(`Entity maintainer task [${id}]: executing run`);
              maintainerStatus.state = await run({ status: maintainerStatus, abortController, logger, fakeRequest });
              maintainerStatus.metadata.lastSuccessTimestamp = new Date().toISOString();
            } catch (error) {
              maintainerStatus.metadata.lastErrorTimestamp = new Date().toISOString();
              logger.debug(`Entity maintainer task [${id}]: run failed - ${error.message}`);
            } finally {
              maintainerStatus.metadata.runs++;
            }

            return {
              state: maintainerStatus,
            };
          },
        }),
      },
    });
  } catch (e) {
    logger.error(`Error registering entity maintainer task: ${e.message}`);
    throw e;
  }
}