/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  RruleSchedule,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';

import { DeployPrivateLocationMonitors } from './deploy_private_location_monitors';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import type { SyntheticsServerSetup } from '../types';

const TASK_TYPE = 'Synthetics:Sync-Global-Params-Private-Locations';

interface TaskState extends Record<string, unknown> {
  paramsSpaceToSync: string;
}

export type CustomTaskInstance = Omit<ConcreteTaskInstance, 'state'> & {
  state: Partial<TaskState>;
};

export class SyncGlobalParamsPrivateLocationsTask {
  public deployPackagePolicies: DeployPrivateLocationMonitors;
  constructor(
    public serverSetup: SyntheticsServerSetup,
    public taskManager: TaskManagerSetupContract,
    public syntheticsMonitorClient: SyntheticsMonitorClient
  ) {
    this.deployPackagePolicies = new DeployPrivateLocationMonitors(
      serverSetup,
      syntheticsMonitorClient
    );
  }

  registerTaskDefinition(taskManager: TaskManagerSetupContract) {
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Synthetics Sync Global Params Task',
        description:
          'This task is executed so that we can sync private location monitors for example when global params are updated',
        timeout: '10m',
        maxAttempts: 2,
        createTaskRunner: ({ taskInstance }) => {
          return {
            run: async () => {
              return this.runTask({ taskInstance });
            },
          };
        },
      },
    });
  }

  public async runTask({ taskInstance }: { taskInstance: CustomTaskInstance }): Promise<{
    state: TaskState;
    error?: Error;
    schedule?: IntervalSchedule | RruleSchedule;
  } | void> {
    const {
      coreStart: { savedObjects },
      encryptedSavedObjects,
      logger,
    } = this.serverSetup;

    const paramsSpaceToSync = taskInstance.state.paramsSpaceToSync;
    if (paramsSpaceToSync) {
      try {
        this.debugLog(`current task state is ${JSON.stringify(taskInstance.state)}`);
        const soClient = savedObjects.createInternalRepository();

        const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
        if (allPrivateLocations.length > 0) {
          await this.deployPackagePolicies.syncAllPackagePolicies({
            allPrivateLocations,
            soClient,
            encryptedSavedObjects,
            spaceIdToSync: paramsSpaceToSync,
          });
          this.debugLog(`Sync of global params succeeded for space  ${paramsSpaceToSync}`);
        }
      } catch (error) {
        logger.error(`Sync of global params failed: ${error.message}`);
        return {
          error,
          state: {
            paramsSpaceToSync,
          },
        };
      }
    }
  }

  debugLog = (message: string) => {
    this.serverSetup.logger.debug(`[SyncGlobalParamsPrivateLocationsTask] ${message}`);
  };
}

export const asyncGlobalParamsPropagation = async ({
  server,
  paramsSpacesToSync,
}: {
  server: SyntheticsServerSetup;
  paramsSpacesToSync: string[];
}) => {
  const {
    pluginsStart: { taskManager },
  } = server;
  const spacesToUpdate = paramsSpacesToSync.includes(ALL_SPACES_ID)
    ? [ALL_SPACES_ID]
    : paramsSpacesToSync;

  await Promise.all(
    spacesToUpdate.map(async (spaceId) => {
      await taskManager.ensureScheduled({
        id: `${TASK_TYPE}:${uuidv4()}`,
        params: {},
        taskType: TASK_TYPE,
        runAt: new Date(Date.now() + 3 * 1000),
        state: { paramsSpaceToSync: spaceId },
      });
    })
  );
};
