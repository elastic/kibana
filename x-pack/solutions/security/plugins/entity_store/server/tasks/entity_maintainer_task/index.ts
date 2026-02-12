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

function getTaskType(id: string): string {
  return `${TasksConfig[EntityStoreTaskType.Values.entityMaintainer].type}:${id}`;
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
      const internalRepo = start.savedObjects.createInternalRepository();
      const newEntry = { id, interval };
      internalRepo
        .get<{ 'entity-maintainers-tasks': Array<{ id: string; interval: string }> }>(
          EntityMaintainersTasksTypeName,
          EntityMaintainersTasksSingletonId
        )
        .then((existing) => {
          const tasks = existing.attributes['entity-maintainers-tasks'] ?? [];
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
            const maintainerSatus: EntityMaintainerStatus = {
              metaData: {
                runs: currentStatus?.metaData?.runs || 0,
                lastSuccessTimestamp: currentStatus?.metaData?.lastSuccessTimestamp || null,
                lastErrorTimestamp: currentStatus?.metaData?.lastErrorTimestamp || null,
              },
              state: currentStatus?.state?.runs ? currentStatus.state : initialState,
            };

            const isFirstRun = maintainerSatus.metaData.runs === 0;

            if (isFirstRun && setup) {
              maintainerSatus.state = await setup({ state: maintainerSatus });
            }
            maintainerSatus.state = await run({ state: maintainerSatus });
            maintainerSatus.metaData.runs++;
            maintainerSatus.metaData.lastSuccessTimestamp = new Date().toISOString();

            // TODO: Handle error
            return {
              state: maintainerSatus,
            };
          },
        }),
      },
    });

  } catch (e) {
    logger.error(`Error registering extract entity tasks, received ${e.message}`);
    throw e;
  }
}