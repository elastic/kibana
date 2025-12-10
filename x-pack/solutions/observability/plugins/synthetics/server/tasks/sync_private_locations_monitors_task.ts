/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  RruleSchedule,
} from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/common';
import pRetry from 'p-retry';
import { DeployPrivateLocationMonitors } from './deploy_private_location_monitors';
import { cleanUpDuplicatedPackagePolicies } from './clean_up_duplicate_policies';
import type { HeartbeatConfig } from '../../common/runtime_types';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import type { SyntheticsServerSetup } from '../types';

const TASK_TYPE = 'Synthetics:Sync-Private-Location-Monitors';
export const PRIVATE_LOCATIONS_SYNC_TASK_ID = `${TASK_TYPE}-single-instance`;
const TASK_SCHEDULE = '60m';

export interface SyncTaskState extends Record<string, unknown> {
  lastStartedAt: string;
  lastTotalMWs: number;
  hasAlreadyDoneCleanup: boolean;
  maxCleanUpRetries: number;
}

export type CustomTaskInstance = Omit<ConcreteTaskInstance, 'state'> & {
  state: Partial<SyncTaskState>;
};

export class SyncPrivateLocationMonitorsTask {
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
        timeout: '5m',
        maxAttempts: 1,
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
    state: SyncTaskState;
    error?: Error;
    schedule?: IntervalSchedule | RruleSchedule;
  }> {
    this.debugLog(
      `Syncing private location monitors, current task state is ${JSON.stringify(
        taskInstance.state
      )}`
    );

    const {
      coreStart: { savedObjects },
      encryptedSavedObjects,
      logger,
      pluginsStart: { encryptedSavedObjects },
    } = this.serverSetup;
    const lastStartedAt =
      taskInstance.state.lastStartedAt || moment().subtract(10, 'minute').toISOString();
    const startedAt = taskInstance.startedAt || new Date();

    const taskState = {
      lastStartedAt: startedAt.toISOString(),
      lastTotalParams: taskInstance.state.lastTotalParams || 0,
      lastTotalMWs: taskInstance.state.lastTotalMWs || 0,
      hasAlreadyDoneCleanup: taskInstance.state.hasAlreadyDoneCleanup || false,
      maxCleanUpRetries: taskInstance.state.maxCleanUpRetries || 3,
    };

    try {
      const soClient = savedObjects.createInternalRepository([
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      ]);

      const { performSync } = await this.cleanUpDuplicatedPackagePolicies(soClient, taskState);

      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
      const { hasMWsChanged } = await this.hasMWsChanged({
        soClient,
        taskState,
        lastStartedAt,
      });

      // Only perform syncGlobalParams if:
      // - hasMWsChanged and disableAutoSync is false
      // - OR performCleanupSync is true (from cleanup), regardless of disableAutoSync
      const dataChangeSync = hasMWsChanged && !taskState.disableAutoSync;
      if (dataChangeSync || performCleanupSync) {
        if (dataChangeSync) {
          this.debugLog(`Syncing private location monitors because data has changed`);
        } else {
          this.debugLog(`Syncing private location monitors because cleanup performed a change`);
        }

        if (allPrivateLocations.length > 0) {
          await this.deployPackagePolicies.syncPackagePolicies({
            allPrivateLocations,
            soClient,
            encryptedSavedObjects,
          });
        } else {
          this.debugLog(`No private locations found, skipping sync`);
        }
        this.debugLog(`Sync of private location monitors succeeded`);
      } else {
        this.debugLog(
          `No data has changed since last run ${lastStartedAt}, skipping sync of private location monitors`
        );
      }
    } catch (error) {
      logger.error(`Sync of private location monitors failed: ${error.message}`);
      return {
        error,
        state: taskState,
        schedule: {
          interval: TASK_SCHEDULE,
        },
      };
    }
    return {
      state: taskState,
      schedule: {
        interval: TASK_SCHEDULE,
      },
    };
  }

  getNewTaskState({ taskInstance }: { taskInstance: CustomTaskInstance }): SyncTaskState {
    const startedAt = taskInstance.startedAt || new Date();

    return {
      lastStartedAt: startedAt.toISOString(),
      lastTotalMWs: taskInstance.state.lastTotalMWs || 0,
      hasAlreadyDoneCleanup: taskInstance.state.hasAlreadyDoneCleanup || false,
      maxCleanUpRetries: taskInstance.state.maxCleanUpRetries || 3,
      disableAutoSync: taskInstance.state.disableAutoSync ?? false,
    };
  }

  start = async () => {
    const {
      pluginsStart: { taskManager },
    } = this.serverSetup;
    this.debugLog(`Scheduling private location task`);
    await taskManager.ensureScheduled({
      id: PRIVATE_LOCATIONS_SYNC_TASK_ID,
      state: {},
      schedule: {
        interval: TASK_SCHEDULE,
      },
      taskType: TASK_TYPE,
      params: {},
    });
    this.debugLog(`Sync private location monitors task scheduled successfully`);
  };

  parseLocations(config: HeartbeatConfig) {
    const { locations } = config;

    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);
    const publicLocations = locations.filter((loc) => loc.isServiceManaged);

    return { privateLocations, publicLocations };
  }

  async hasMWsChanged({
    soClient,
    lastStartedAt,
    taskState,
  }: {
    soClient: SavedObjectsClientContract;
    lastStartedAt: string;
    taskState: SyncTaskState;
  }) {
    const { logger } = this.serverSetup;
    const { lastTotalMWs } = taskState;

    const [editedMWs, totalMWs] = await Promise.all([
      soClient.find({
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        perPage: 0,
        namespaces: [ALL_SPACES_ID],
        filter: `${MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE}.updated_at > "${lastStartedAt}"`,
        fields: [],
      }),
      soClient.find({
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        perPage: 0,
        namespaces: [ALL_SPACES_ID],
        fields: [],
      }),
    ]);
    logger.debug(
      `Found ${editedMWs.total} maintenance windows updated and ${totalMWs.total} total maintenance windows`
    );
    const updatedMWs = editedMWs.total;
    const noOfMWs = totalMWs.total;

    const hasMWsChanged = updatedMWs > 0 || noOfMWs !== lastTotalMWs;

    taskState.lastTotalMWs = noOfMWs;

    return {
      hasMWsChanged,
    };
  }

  async cleanUpDuplicatedPackagePolicies(
    soClient: SavedObjectsClientContract,
    taskState: SyncTaskState
  ) {
    return await cleanUpDuplicatedPackagePolicies(this.serverSetup, soClient, taskState);
  }

  debugLog = (message: string) => {
    this.serverSetup.logger.debug(`[SyncPrivateLocationMonitorsTask] ${message}`);
  };
}

export const runSynPrivateLocationMonitorsTaskSoon = async ({
  server,
  retries = 5,
}: {
  server: SyntheticsServerSetup;
  retries?: number;
}) => {
  try {
    await pRetry(
      async () => {
        const {
          logger,
          pluginsStart: { taskManager },
        } = server;
        logger.debug(`Scheduling Synthetics sync private location monitors task soon`);
        await taskManager.runSoon(PRIVATE_LOCATIONS_SYNC_TASK_ID);
        logger.debug(`Synthetics sync private location task scheduled successfully`);
      },
      {
        retries,
      }
    );
  } catch (error) {
    server.logger.error(
      `Error scheduling Synthetics sync private location monitors task: ${error.message}`,
      { error }
    );
  }
};

export const resetSyncPrivateCleanUpState = async ({
  server,
}: {
  server: SyntheticsServerSetup;
}) => {
  const {
    logger,
    pluginsStart: { taskManager },
  } = server;
  logger.debug(`Resetting Synthetics sync private location monitors cleanup state`);
  await taskManager.bulkUpdateState([PRIVATE_LOCATIONS_SYNC_TASK_ID], (state) => ({
    ...state,
    hasAlreadyDoneCleanup: false,
  }));
  await runSynPrivateLocationMonitorsTaskSoon({ server });
  logger.debug(`Synthetics sync private location monitors cleanup state reset successfully`);
};
