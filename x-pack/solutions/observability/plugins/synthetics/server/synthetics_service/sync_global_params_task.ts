/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server/plugin';
import { getPrivateLocations } from './get_private_locations';
import { SyntheticsServerSetup } from '../types';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';

const SYNC_GLOBAL_PARAMS_TASK_TYPE = 'Synthetics:Sync-Global-Params';

export const registerSyncGlobalParamsTask = ({
  taskManager,
  serverSetup,
  syntheticsMonitorClient,
}: {
  taskManager: TaskManagerSetupContract;
  serverSetup: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
}) => {
  const { logger } = serverSetup;
  taskManager.registerTaskDefinitions({
    [SYNC_GLOBAL_PARAMS_TASK_TYPE]: {
      title: 'Synthetics Sync Global Params Task',
      description:
        'This task is executed after adding, editing or removing global parameters to sync the monitors with the new values.',
      timeout: '1m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        return {
          run: async () => {
            const {
              taskInstance: {
                params: { spaceId },
              },
            } = context;
            const {
              coreStart: { savedObjects },
              encryptedSavedObjects,
            } = serverSetup;

            try {
              logger.debug(`Synching global parameters of space with id ${spaceId}`);
              const savedObjectsClient = savedObjects.createInternalRepository();
              const allPrivateLocations = await getPrivateLocations(savedObjectsClient);
              await syntheticsMonitorClient.syncGlobalParams({
                spaceId,
                allPrivateLocations,
                soClient: savedObjectsClient,
                encryptedSavedObjects,
              });
            } catch (error) {
              logger.error(
                `Sync of global parameters for space with id ${spaceId} failed: ${error.message}`
              );
              return { error, state: {} };
            }
          },
        };
      },
    },
  });
};

export const scheduleSpaceSyncGlobalParamsTask = async ({
  spaceId,
  taskManager,
  logger,
}: {
  spaceId: string;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  try {
    logger.debug(`Scheduling sync global parameters task for space with id ${spaceId}`);
    const task = await taskManager.schedule({
      params: { spaceId },
      state: {},
      taskType: SYNC_GLOBAL_PARAMS_TASK_TYPE,
    });
    await taskManager.runSoon(task.id);
    logger.debug(`Task scheduled successfully`);
  } catch (error) {
    logger.error(
      `Error scheduling synthetics sync global parameters task for space with id ${spaceId}, ${error.message}`
    );
  }
};
