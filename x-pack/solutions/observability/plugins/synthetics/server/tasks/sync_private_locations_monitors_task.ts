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
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/maintenance-windows-plugin/common';
import pRetry from 'p-retry';
import {
  legacyMonitorAttributes,
  syntheticsMonitorAttributes,
  syntheticsMonitorSOTypes,
} from '../../common/types/saved_objects';
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
  hasAlreadyDoneCleanup: boolean;
  maxCleanUpRetries: number;
  disableAutoSync?: boolean;
  privateLocationId?: string;
}

export type CustomTaskInstance = Omit<ConcreteTaskInstance, 'state'> & {
  state: Partial<SyncTaskState>;
};

export class SyncPrivateLocationMonitorsTask {
  public deployPackagePolicies: DeployPrivateLocationMonitors;
  constructor(
    public serverSetup: SyntheticsServerSetup,
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
      logger,
      encryptedSavedObjects,
    } = this.serverSetup;

    let lastStartedAt = taskInstance.state.lastStartedAt;
    // if it's too old, set it to 10 minutes ago to avoid syncing everything the first time
    if (!lastStartedAt || moment(lastStartedAt).isBefore(moment().subtract(6, 'hour'))) {
      lastStartedAt = moment().subtract(10, 'minute').toISOString();
    }
    const taskState = this.getNewTaskState({ taskInstance });

    try {
      const soClient = savedObjects.createInternalRepository([
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      ]);
      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);

      if (taskInstance.state.privateLocationId) {
        // if privateLocationId exists on state, we just perform sync and exit
        await this.deployPackagePolicies.syncAllPackagePolicies({
          allPrivateLocations,
          encryptedSavedObjects,
          privateLocationId: taskInstance.state.privateLocationId,
          soClient: savedObjects.createInternalRepository(),
        });

        return {
          state: {
            ...taskInstance.state,
            privateLocationId: undefined,
          } as SyncTaskState,
        };
      }

      const defaultState = {
        state: taskState,
        schedule: {
          interval: TASK_SCHEDULE,
        },
      };

      const { performCleanupSync } = await this.cleanUpDuplicatedPackagePolicies(
        soClient,
        taskState
      );

      if (allPrivateLocations.length === 0) {
        this.debugLog(`No private locations found, skipping sync of private location monitors`);
        return {
          state: taskState,
          schedule: {
            interval: TASK_SCHEDULE,
          },
        };
      }
      if (performCleanupSync) {
        this.debugLog(`Syncing private location monitors because cleanup performed a change`);

        if (allPrivateLocations.length > 1) {
          // if there are multiple locations, we run a task per location to optimize it
          for (const location of allPrivateLocations) {
            await runTaskPerPrivateLocation({
              server: this.serverSetup,
              privateLocationId: location.id,
            });
          }
        } else {
          await this.deployPackagePolicies.syncAllPackagePolicies({
            allPrivateLocations,
            soClient,
            encryptedSavedObjects,
          });
        }
        return defaultState;
      }

      if (taskState.disableAutoSync) {
        this.debugLog(`Auto sync is disabled, skipping sync of private location monitors`);
        return defaultState;
      }

      const monitorMwsIds = await this.fetchMonitorMwsIds(soClient);
      if (monitorMwsIds.length === 0) {
        this.debugLog(
          `No monitors with maintenance windows found, skipping sync of private location monitors`
        );
        return defaultState;
      }

      const { hasMWsChanged, updatedMWs, missingMWIds, maintenanceWindows } =
        await this.hasMWsChanged({
          soClient,
          taskState,
          lastStartedAt,
          monitorMwsIds,
        });

      const dataChangeSync = hasMWsChanged && !taskState.disableAutoSync;
      if (dataChangeSync) {
        this.debugLog(`Syncing private location monitors because data has changed`);

        await this.deployPackagePolicies.syncPackagePoliciesForMws({
          allPrivateLocations,
          soClient,
          updatedMWs,
          missingMWIds,
          // this is passed so we don't have to fetch them again in the method
          maintenanceWindows,
        });

        this.debugLog(`Sync of private location monitors succeeded`);
      } else {
        if (taskState.disableAutoSync) {
          this.debugLog(`Auto sync is disabled, skipping sync of private location monitors`);
        } else {
          this.debugLog(
            `No data has changed since last run ${lastStartedAt}, skipping sync of private location monitors`
          );
        }
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

  async fetchMonitorMwsIds(soClient: SavedObjectsClientContract) {
    const monitorsWithMws = await soClient.find<
      unknown,
      {
        monitorMws: {
          buckets: Array<{ key: string; doc_count: number }>;
        };
        legacyMonitorsMws: {
          buckets: Array<{ key: string; doc_count: number }>;
        };
      }
    >({
      type: syntheticsMonitorSOTypes,
      perPage: 0,
      namespaces: [ALL_SPACES_ID],
      fields: [],
      aggs: {
        monitorMws: {
          terms: { field: `${syntheticsMonitorAttributes}.maintenance_windows`, size: 1000 },
        },
        legacyMonitorsMws: {
          terms: { field: `${legacyMonitorAttributes}.maintenance_windows`, size: 1000 },
        },
      },
    });
    const { monitorMws, legacyMonitorsMws } = monitorsWithMws.aggregations || {};
    const monitorMwsIds = monitorMws?.buckets.map((b) => b.key) || [];
    const legacyMonitorMwsIds = legacyMonitorsMws?.buckets.map((b) => b.key) || [];

    this.debugLog(`Fetched monitor MWs IDs: ${JSON.stringify(monitorMwsIds)}`);
    this.debugLog(`Fetched legacy monitor MWs IDs: ${JSON.stringify(legacyMonitorMwsIds)}`);

    return Array.from(new Set([...monitorMwsIds, ...legacyMonitorMwsIds]));
  }

  async hasMWsChanged({
    lastStartedAt,
    monitorMwsIds,
  }: {
    soClient: SavedObjectsClientContract;
    lastStartedAt: string;
    taskState: SyncTaskState;
    monitorMwsIds: string[];
  }) {
    const { syntheticsService } = this.syntheticsMonitorClient;

    const maintenanceWindows = (await syntheticsService.getMaintenanceWindows(ALL_SPACES_ID)) ?? [];
    // check if any of the MWs were updated since the last run
    const updatedMWs = maintenanceWindows.filter((mw) => {
      const updatedAt = mw.updatedAt;
      return moment(updatedAt).isAfter(moment(lastStartedAt));
    });

    this.debugLog(`Updated MWs: ${updatedMWs.map((mw) => mw.id).join(', ')}`);

    // check if any MWs are missing
    const missingMWIds = monitorMwsIds.filter((mwId) => {
      return !maintenanceWindows.find((mw) => mw.id === mwId);
    });

    this.debugLog('Missing MW IDs: ' + JSON.stringify(missingMWIds));

    return {
      hasMWsChanged: updatedMWs.length > 0 || missingMWIds.length > 0,
      updatedMWs,
      missingMWIds,
      maintenanceWindows: maintenanceWindows.filter((mw) => monitorMwsIds.includes(mw.id)),
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
  hasAlreadyDoneCleanup = false,
}: {
  server: SyntheticsServerSetup;
  hasAlreadyDoneCleanup: boolean;
}) => {
  const {
    logger,
    pluginsStart: { taskManager },
  } = server;
  logger.debug(`Resetting Synthetics sync private location monitors cleanup state`);
  await taskManager.bulkUpdateState([PRIVATE_LOCATIONS_SYNC_TASK_ID], (state) => ({
    ...state,
    hasAlreadyDoneCleanup,
  }));
  await runSynPrivateLocationMonitorsTaskSoon({ server });
  logger.debug(`Synthetics sync private location monitors cleanup state reset successfully`);
};

export const disableSyncPrivateLocationTask = async ({
  server,
  disableAutoSync,
}: {
  server: SyntheticsServerSetup;
  disableAutoSync: boolean;
}) => {
  const {
    logger,
    pluginsStart: { taskManager },
  } = server;
  logger.debug(
    `Setting Synthetics sync private location monitors disableAutoSync to ${disableAutoSync}`
  );
  await taskManager.bulkUpdateState([PRIVATE_LOCATIONS_SYNC_TASK_ID], (state) => ({
    ...state,
    disableAutoSync,
  }));
  logger.debug(`Synthetics sync private location monitors disableAutoSync set successfully`);
};

export const runTaskPerPrivateLocation = async ({
  server,
  privateLocationId,
}: {
  server: SyntheticsServerSetup;
  privateLocationId: string;
}) => {
  const {
    pluginsStart: { taskManager },
  } = server;

  await taskManager.ensureScheduled({
    id: `${TASK_TYPE}:${privateLocationId}`,
    params: {},
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: { privateLocationId },
  });
};
