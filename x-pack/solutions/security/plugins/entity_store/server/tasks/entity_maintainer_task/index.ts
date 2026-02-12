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

export function registerEntityMaintainerTask({
  taskManager,
  logger,
  config,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: RegisterEntityMaintainerConfig;
}): void {
  try {
    const { type, title } = TasksConfig[EntityStoreTaskType.Values.entityMaintainer];
    const { run, interval, initialState, description, name, id, setup } = config;

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