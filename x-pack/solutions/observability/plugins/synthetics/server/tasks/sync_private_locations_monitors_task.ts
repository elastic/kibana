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
import {
  DeployPrivateLocationMonitors,
  formatFailedCreates,
} from './deploy_private_location_monitors';
import { cleanUpDuplicatedPackagePolicies } from './clean_up_duplicate_policies';
import type { HeartbeatConfig } from '../../common/runtime_types';
import { MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL } from '../../common/constants';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import type { SyntheticsServerSetup } from '../types';

const TASK_TYPE = 'Synthetics:Sync-Private-Location-Monitors';
export const PRIVATE_LOCATIONS_SYNC_TASK_ID = `${TASK_TYPE}-single-instance`;
export const DEFAULT_TASK_SCHEDULE = `${MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL}m`;

/**
 * Consecutive no-progress cleanup passes tolerated before cleanup gives up, so a
 * recreate that can never succeed stops re-running every interval.
 */
export const DEFAULT_MAX_CLEANUP_RETRIES = 3;

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

// TM forbids `runAt` and `schedule` on the same result object.
export type SyncTaskRunResult =
  | { state: SyncTaskState; error?: Error; schedule: IntervalSchedule | RruleSchedule }
  | { state: SyncTaskState; error?: Error; runAt: Date }
  | { state: SyncTaskState; error?: Error };

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
        title: 'Synthetics Sync Private Location Monitors Task',
        description:
          'This task syncs private location monitor package policies, handling maintenance window changes and cleaning up duplicate policies',
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

  public async runTask({
    taskInstance,
  }: {
    taskInstance: CustomTaskInstance;
  }): Promise<SyncTaskRunResult> {
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

    const interval =
      (taskInstance.schedule as IntervalSchedule | undefined)?.interval ?? DEFAULT_TASK_SCHEDULE;

    try {
      const soClient = savedObjects.createInternalRepository([
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      ]);
      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);

      const { privateLocationId } = taskInstance.state;
      if (privateLocationId) {
        // This instance is one-shot, so never return a schedule: task manager
        // would turn a failed run into a recurring task. A failed recreate is
        // re-attempted by the next cleanup run, bounded by maxCleanUpRetries.
        const state = {
          ...taskInstance.state,
          privateLocationId: undefined,
        } as SyncTaskState;

        try {
          const { failedCreatesBySpace } = await this.deployPackagePolicies.syncAllPackagePolicies({
            allPrivateLocations,
            encryptedSavedObjects,
            privateLocationId,
            soClient: savedObjects.createInternalRepository(),
          });

          if (failedCreatesBySpace.length > 0) {
            // surface it as a task failure so the next cleanup run re-attempts
            // the recreate instead of treating it as already done
            const error = new Error(formatFailedCreates(failedCreatesBySpace));
            logger.error(
              `Sync of private location monitors failed for location ${privateLocationId}: ${error.message}`
            );
            return { error, state };
          }
        } catch (error) {
          logger.error(
            `Sync of private location monitors failed for location ${privateLocationId}: ${error.message}`
          );
          return { error, state };
        }

        return { state };
      }

      const defaultState = {
        state: taskState,
        schedule: { interval },
      };

      const { performCleanupSync } = await this.cleanUpDuplicatedPackagePolicies(
        soClient,
        taskState
      );

      if (allPrivateLocations.length === 0) {
        this.debugLog(`No private locations found, skipping sync of private location monitors`);
        taskState.hasAlreadyDoneCleanup = true;
        return { state: taskState, schedule: { interval } };
      }
      if (performCleanupSync) {
        this.debugLog(
          `Syncing private location monitors because cleanup performed a change, ` +
            `locations count: ${allPrivateLocations.length}`
        );

        for (const location of allPrivateLocations) {
          await runTaskPerPrivateLocation({
            server: this.serverSetup,
            privateLocationId: location.id,
          });
        }
        this.debugLog(`Scheduled post-cleanup sync per private location`);
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

      // Only `updatedAt` after this run's start — missing IDs persist after a
      // sync and would schedule follow-ups forever.
      if (await this.haveMWsUpdatedSince(taskState.lastStartedAt, monitorMwsIds)) {
        this.debugLog(
          `Maintenance windows changed during this run; scheduling an immediate follow-up`
        );
        return { state: taskState, runAt: new Date() };
      }
    } catch (error) {
      logger.error(`Sync of private location monitors failed: ${error.message}`);
      return { error, state: taskState, schedule: { interval } };
    }

    return { state: taskState, schedule: { interval } };
  }

  getNewTaskState({ taskInstance }: { taskInstance: CustomTaskInstance }): SyncTaskState {
    const startedAt = taskInstance.startedAt || new Date();

    return {
      lastStartedAt: startedAt.toISOString(),
      hasAlreadyDoneCleanup: taskInstance.state.hasAlreadyDoneCleanup || false,
      // `??`, not `||`: a persisted 0 means the budget is spent, and `||` would
      // silently hand back a fresh 3 and re-run cleanup on every interval forever
      maxCleanUpRetries: taskInstance.state.maxCleanUpRetries ?? DEFAULT_MAX_CLEANUP_RETRIES,
      disableAutoSync: taskInstance.state.disableAutoSync ?? false,
    };
  }

  start = async () => {
    const {
      pluginsStart: { taskManager },
    } = this.serverSetup;
    this.debugLog(`Scheduling private location task`);

    // Read the existing task schedule so ensureScheduled doesn't reset a user-configured interval
    // on every Kibana restart. Falls back to DEFAULT_TASK_SCHEDULE only on first creation.
    let schedule: IntervalSchedule = { interval: DEFAULT_TASK_SCHEDULE };
    try {
      const existingTask = await taskManager.get(PRIVATE_LOCATIONS_SYNC_TASK_ID);
      if (existingTask.schedule) {
        schedule = existingTask.schedule as IntervalSchedule;
      }
    } catch (_err) {
      // task doesn't exist yet — default schedule will be used on creation
    }

    await taskManager.ensureScheduled({
      id: PRIVATE_LOCATIONS_SYNC_TASK_ID,
      state: {},
      schedule,
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

  async haveMWsUpdatedSince(sinceIso: string, monitorMwsIds: string[]): Promise<boolean> {
    const { syntheticsService } = this.syntheticsMonitorClient;
    const maintenanceWindows = (await syntheticsService.getMaintenanceWindows(ALL_SPACES_ID)) ?? [];
    const monitorMwIds = new Set(monitorMwsIds);
    return maintenanceWindows.some((mw) => {
      if (!monitorMwIds.has(mw.id)) {
        return false;
      }
      const updatedAt = mw.updatedAt;
      return Boolean(updatedAt) && moment(updatedAt).isAfter(moment(sinceIso));
    });
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

/**
 * Asks task manager to run the private-location sync task now.
 *
 * Throws when scheduling ultimately fails (for example the task is already
 * running and cannot be re-run within the retry window). Callers that answer an
 * HTTP request must propagate that: a swallowed failure meant the caller was told
 * the sync had been scheduled when nothing had been, and the work only happened
 * whenever the periodic interval next came around. Fire-and-forget callers are
 * expected to attach their own `catch`.
 */
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
    throw error;
  }
};

export const resetSyncPrivateCleanUpState = async ({
  server,
  hasAlreadyDoneCleanup = false,
  retries,
}: {
  server: SyntheticsServerSetup;
  hasAlreadyDoneCleanup: boolean;
  /** Scheduling attempts before giving up; bounds how long the caller blocks. */
  retries?: number;
}) => {
  const {
    logger,
    pluginsStart: { taskManager },
  } = server;
  logger.debug(`Resetting Synthetics sync private location monitors cleanup state`);
  await taskManager.bulkUpdateState([PRIVATE_LOCATIONS_SYNC_TASK_ID], (state) => ({
    ...state,
    hasAlreadyDoneCleanup,
    // Requesting cleanup must also restore the retry budget. The budget is shared
    // with the periodic runs, so without this an explicit request could inherit a
    // budget those runs had already spent — cleanup would then be skipped outright
    // while this call still reported success.
    ...(hasAlreadyDoneCleanup ? {} : { maxCleanUpRetries: DEFAULT_MAX_CLEANUP_RETRIES }),
  }));
  await runSynPrivateLocationMonitorsTaskSoon({ server, retries });
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

  // `schedule`, not `ensureScheduled`: this is one-shot work, and a fixed id made
  // it unreliable. `ensureScheduled` only updates the schedule of an existing task
  // (and only for interval schedules), so a still-pending or in-flight instance
  // left by an earlier cleanup silently swallowed this request — the policies
  // cleanup had just deleted were then never recreated. A fresh instance per
  // request always runs; the sync itself is idempotent, and the cleanup retry
  // budget bounds how many can be queued.
  await taskManager.schedule({
    params: {},
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: { privateLocationId },
  });
};
