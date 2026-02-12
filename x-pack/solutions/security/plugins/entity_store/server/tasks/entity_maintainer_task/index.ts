/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EntityMaintainerStatus, RegisterEntityMaintainerConfig } from './types';
import { TasksConfig } from "../config";
import { EntityStoreTaskType } from "../constants";
import type { Logger } from '@kbn/logging';
import { EntityStoreCoreSetup } from '../../types';
import {
  EntityMaintainersTasksTypeName,
  EntityMaintainersTasksSingletonId,
} from '../../domain/definitions/saved_objects';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest, ISavedObjectsRepository } from '@kbn/core/server';

function getTaskType(id: string): string {
  return `${TasksConfig[EntityStoreTaskType.Values.entityMaintainer].type}:${id}`;
}

export async function scheduleEntityMaintainerTask({
  logger,
  taskManager,
  namespace,
  request,
  entityMaintainersTasksRepo,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  request: KibanaRequest;
  entityMaintainersTasksRepo: ISavedObjectsRepository;
}): Promise<void> {
  try {
    logger.debug(` =================> Scheduling entity maintainer tasks`);
    const doc = await entityMaintainersTasksRepo.get<{
      'entity-maintainers-tasks': Array<{ id: string; interval: string }>;
    }>(EntityMaintainersTasksTypeName, EntityMaintainersTasksSingletonId);
    logger.debug(` =================> Doc: ${JSON.stringify(doc)}`);
    const tasks = doc.attributes['entity-maintainers-tasks'] ?? [];
    logger.debug(` =================> Tasks: ${JSON.stringify(tasks)}`);
    for (const { id, interval } of tasks) {
      await taskManager.ensureScheduled(
        {
          id,
          taskType: getTaskType(id),
          schedule: { interval },
          state: { namespace },
          params: {},
        },
        { request }
      );
    }
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return;
    }
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
    
    const { title } = TasksConfig[EntityStoreTaskType.Values.entityMaintainer];
    const { run, interval, initialState, description, id, setup } = config;
    const type = getTaskType(id);

    core.getStartServices().then(([start]) => {
      const internalRepo = start.savedObjects.createInternalRepository([
        EntityMaintainersTasksTypeName,
      ]);
      const newEntry = { id, interval };
      internalRepo
        .get<{ 'entity-maintainers-tasks': Array<{ id: string; interval: string }> }>(
          EntityMaintainersTasksTypeName,
          EntityMaintainersTasksSingletonId
        )
        .then((existing) => {
          const tasks = existing.attributes['entity-maintainers-tasks'] ?? [];
          if (tasks.some((t) => t.id === id)) {
            return;
          }
          return internalRepo.update(
            EntityMaintainersTasksTypeName,
            EntityMaintainersTasksSingletonId,
            { 'entity-maintainers-tasks': [...tasks, newEntry] }
          );
        })
        .catch((err: Error) => {
          if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
            return internalRepo.create(
              EntityMaintainersTasksTypeName,
              { 'entity-maintainers-tasks': [newEntry] },
              { id: EntityMaintainersTasksSingletonId }
            );
          }
          logger.error(`Failed to register entity maintainer task in saved object: ${err.message}`);
        });
    });

    taskManager.registerTaskDefinitions({
      [type]: {
        title: title,
        description,
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const currentStatus = taskInstance.state;
            logger.debug(` =================> Entity maintainer task run1: ${JSON.stringify(currentStatus)}`);
            const maintainerSatus: EntityMaintainerStatus = {
              metadata: {
                runs: currentStatus?.metadata?.runs || 0,
                lastSuccessTimestamp: currentStatus?.metadata?.lastSuccessTimestamp || null,
                lastErrorTimestamp: currentStatus?.metadata?.lastErrorTimestamp || null,
              },
              state: currentStatus?.metadata?.runs ? currentStatus.state : initialState,
            };

            const isFirstRun = maintainerSatus.metadata.runs === 0;

            if (isFirstRun && setup) {
              maintainerSatus.state = await setup({ status: maintainerSatus });
            }
            maintainerSatus.state = await run({ status: maintainerSatus });
            maintainerSatus.metadata.runs++;
            maintainerSatus.metadata.lastSuccessTimestamp = new Date().toISOString();
            logger.debug(` =================> Entity maintainer task run2: ${JSON.stringify(maintainerSatus)}`);
            // TODO: Handle error
            return {
              state: maintainerSatus,
            };
          },
        }),
      },
    });


    logger.debug(` =================> Entity maintainer task registered: ${type}`);

  } catch (e) {
    logger.error(`Error registering extract entity tasks, received ${e.message}`);
    throw e;
  }
}