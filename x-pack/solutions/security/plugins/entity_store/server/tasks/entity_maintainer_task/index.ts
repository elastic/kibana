/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { EntityMaintainerState, RegisterEntityMaintainerConfig } from './types';
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
    const {type, title} = TasksConfig[EntityStoreTaskType.Values.entityMaintainer];
    const {run, interval, initialState, description, name, id, setup} = config;

    taskManager.registerTaskDefinitions({
      [type]: {
        title: title,
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const taskState = taskInstance.state;

            const maintainerState: EntityMaintainerState = {
              metaData: {
                runs: taskState?.metaData?.runs || 0,
                lastSuccessTimestamp: taskState?.metaData?.lastSuccessTimestamp || null,
                lastErrorTimestamp: taskState?.metaData?.lastErrorTimestamp || null,
              },
              state: taskState?.state?.runs ? taskState.state : initialState,
            };

            const isFirstRun = maintainerState.metaData.runs === 0;

            if (isFirstRun && setup) {
              await setup({ state: initialState });
            }
            await run();
            return {
              state: { ...state, setupDone: true },
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