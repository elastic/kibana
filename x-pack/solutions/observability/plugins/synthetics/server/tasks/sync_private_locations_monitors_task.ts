/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import type {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/common';
import pRetry from 'p-retry';
import { getFilterForTestNowRun } from '../synthetics_service/private_location/clean_up_task';
import { syntheticsMonitorSOTypes, syntheticsParamType } from '../../common/types/saved_objects';
import { normalizeSecrets } from '../synthetics_service/utils';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type {
  EncryptedSyntheticsMonitorAttributes,
  HeartbeatConfig,
  MonitorFields,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';
import { MonitorConfigRepository } from '../services/monitor_config_repository';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import type { SyntheticsServerSetup } from '../types';
import {
  formatHeartbeatRequest,
  mixParamsWithGlobalParams,
} from '../synthetics_service/formatters/public_formatters/format_configs';
import { SyntheticsPrivateLocation } from '../synthetics_service/private_location/synthetics_private_location';

const TASK_TYPE = 'Synthetics:Sync-Private-Location-Monitors';
export const PRIVATE_LOCATIONS_SYNC_TASK_ID = `${TASK_TYPE}-single-instance`;
const TASK_SCHEDULE = '5m';

interface TaskState extends Record<string, unknown> {
  lastStartedAt: string;
  lastTotalParams: number;
  lastTotalMWs: number;
  hasAlreadyDoneCleanup: boolean;
  maxCleanUpRetries: number;
}

export type CustomTaskInstance = Omit<ConcreteTaskInstance, 'state'> & {
  state: Partial<TaskState>;
};

export class SyncPrivateLocationMonitorsTask {
  constructor(
    public serverSetup: SyntheticsServerSetup,
    public taskManager: TaskManagerSetupContract,
    public syntheticsMonitorClient: SyntheticsMonitorClient
  ) {
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Synthetics Sync Global Params Task',
        description:
          'This task is executed so that we can sync private location monitors for example when global params are updated',
        timeout: '3m',
        maxAttempts: 3,
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
  }): Promise<{ state: TaskState; error?: Error }> {
    const {
      coreStart: { savedObjects },
      encryptedSavedObjects,
      logger,
    } = this.serverSetup;
    const lastStartedAt =
      taskInstance.state.lastStartedAt || moment().subtract(10, 'minute').toISOString();
    const startedAt = taskInstance.startedAt || new Date();

    const taskState = {
      lastStartedAt,
      startedAt: startedAt.toISOString(),
      lastTotalParams: taskInstance.state.lastTotalParams || 0,
      lastTotalMWs: taskInstance.state.lastTotalMWs || 0,
      hasAlreadyDoneCleanup: taskInstance.state.hasAlreadyDoneCleanup || false,
      maxCleanUpRetries: taskInstance.state.maxCleanUpRetries || 3,
    };

    try {
      this.debugLog(
        `Syncing private location monitors, current task state is ${JSON.stringify(taskState)}`
      );
      const soClient = savedObjects.createInternalRepository([
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      ]);

      const { performSync } = await this.cleanUpDuplicatedPackagePolicies(soClient, taskState);

      const allPrivateLocations = await getPrivateLocations(soClient, ALL_SPACES_ID);
      const { hasDataChanged } = await this.hasAnyDataChanged({
        soClient,
        taskState,
      });

      if (hasDataChanged || performSync) {
        if (hasDataChanged) {
          this.debugLog(`Syncing private location monitors because data has changed`);
        } else {
          this.debugLog(`Syncing private location monitors because cleanup performed a change`);
        }

        if (allPrivateLocations.length > 0) {
          await this.syncGlobalParams({
            allPrivateLocations,
            soClient,
            encryptedSavedObjects,
          });
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
      };
    }
    return {
      state: taskState,
    };
  }

  start = async () => {
    const {
      logger,
      pluginsStart: { taskManager },
    } = this.serverSetup;
    logger.debug(`Scheduling private location task`);
    await taskManager.ensureScheduled({
      id: PRIVATE_LOCATIONS_SYNC_TASK_ID,
      state: {},
      schedule: {
        interval: TASK_SCHEDULE,
      },
      taskType: TASK_TYPE,
      params: {},
    });
    logger.debug(`Sync private location monitors task scheduled successfully`);
  };

  hasAnyDataChanged = async ({
    taskState,
    soClient,
  }: {
    taskState: TaskState;
    soClient: SavedObjectsClientContract;
  }) => {
    const { lastTotalParams, lastTotalMWs, lastStartedAt } = taskState;

    const { totalParams, hasParamsChanges } = await this.hasAnyParamChanged({
      soClient,
      lastStartedAt,
      lastTotalParams,
    });
    const { totalMWs, hasMWsChanged } = await this.hasMWsChanged({
      soClient,
      lastStartedAt,
      lastTotalMWs,
    });
    taskState.lastTotalParams = totalParams;
    taskState.lastTotalMWs = totalMWs;

    const hasDataChanged = hasMWsChanged || hasParamsChanges;
    return { hasDataChanged };
  };

  async syncGlobalParams({
    allPrivateLocations,
    encryptedSavedObjects,
    soClient,
  }: {
    soClient: SavedObjectsClientContract;
    allPrivateLocations: PrivateLocationAttributes[];
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  }) {
    const { privateLocationAPI } = this.syntheticsMonitorClient;

    const { configsBySpaces, paramsBySpace, spaceIds, maintenanceWindows } =
      await this.getAllMonitorConfigs({
        encryptedSavedObjects,
        soClient,
      });

    for (const spaceId of spaceIds) {
      const privateConfigs: Array<{
        config: HeartbeatConfig;
        globalParams: Record<string, string>;
      }> = [];
      const monitors = configsBySpaces[spaceId];
      this.debugLog(`Processing spaceId: ${spaceId}, monitors count: ${monitors?.length ?? 0}`);
      if (!monitors) {
        continue;
      }
      for (const monitor of monitors) {
        const { privateLocations } = this.parseLocations(monitor);

        if (privateLocations.length > 0) {
          privateConfigs.push({ config: monitor, globalParams: paramsBySpace[spaceId] });
        }
      }
      if (privateConfigs.length > 0) {
        this.debugLog(
          `Syncing private configs for spaceId: ${spaceId}, privateConfigs count: ${privateConfigs.length}`
        );

        await privateLocationAPI.editMonitors(
          privateConfigs,
          allPrivateLocations,
          spaceId,
          maintenanceWindows
        );
      } else {
        this.debugLog(`No privateConfigs to sync for spaceId: ${spaceId}`);
      }
    }
  }

  async getAllMonitorConfigs({
    soClient,
    encryptedSavedObjects,
  }: {
    soClient: SavedObjectsClientContract;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  }) {
    const { syntheticsService } = this.syntheticsMonitorClient;
    const paramsBySpacePromise = syntheticsService.getSyntheticsParams({ spaceId: ALL_SPACES_ID });
    const maintenanceWindowsPromise = syntheticsService.getMaintenanceWindows();
    const monitorConfigRepository = new MonitorConfigRepository(
      soClient,
      encryptedSavedObjects.getClient()
    );

    const monitorsPromise = monitorConfigRepository.findDecryptedMonitors({
      spaceId: ALL_SPACES_ID,
    });

    const [paramsBySpace, monitors, maintenanceWindows] = await Promise.all([
      paramsBySpacePromise,
      monitorsPromise,
      maintenanceWindowsPromise,
    ]);

    return {
      ...this.mixParamsWithMonitors(monitors, paramsBySpace),
      paramsBySpace,
      maintenanceWindows,
    };
  }

  parseLocations(config: HeartbeatConfig) {
    const { locations } = config;

    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);
    const publicLocations = locations.filter((loc) => loc.isServiceManaged);

    return { privateLocations, publicLocations };
  }

  mixParamsWithMonitors(
    monitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>>,
    paramsBySpace: Record<string, Record<string, string>>
  ) {
    const configsBySpaces: Record<string, HeartbeatConfig[]> = {};
    const spaceIds = new Set<string>();

    for (const monitor of monitors) {
      const spaceId = monitor.namespaces?.[0];
      if (!spaceId) {
        continue;
      }
      spaceIds.add(spaceId);
      const normalizedMonitor = normalizeSecrets(monitor).attributes as MonitorFields;
      const { str: paramsString } = mixParamsWithGlobalParams(
        paramsBySpace[spaceId],
        normalizedMonitor
      );

      if (!configsBySpaces[spaceId]) {
        configsBySpaces[spaceId] = [];
      }

      configsBySpaces[spaceId].push(
        formatHeartbeatRequest(
          {
            spaceId,
            monitor: normalizedMonitor,
            configId: monitor.id,
          },
          paramsString
        )
      );
    }

    return { configsBySpaces, spaceIds };
  }

  async hasAnyParamChanged({
    soClient,
    lastStartedAt,
    lastTotalParams,
  }: {
    soClient: SavedObjectsClientContract;
    lastStartedAt: string;
    lastTotalParams: number;
  }) {
    const { logger } = this.serverSetup;
    const [editedParams, totalParams] = await Promise.all([
      soClient.find({
        type: syntheticsParamType,
        perPage: 0,
        namespaces: [ALL_SPACES_ID],
        filter: `synthetics-param.updated_at > "${lastStartedAt}"`,
        fields: [],
      }),
      soClient.find({
        type: syntheticsParamType,
        perPage: 0,
        namespaces: [ALL_SPACES_ID],
        fields: [],
      }),
    ]);
    logger.debug(
      `Found ${editedParams.total} params updated and ${totalParams.total} total params`
    );
    const updatedParams = editedParams.total;
    const noOfParams = totalParams.total;

    const hasParamsChanges = updatedParams > 0 || noOfParams !== lastTotalParams;

    return {
      hasParamsChanges,
      updatedParams: editedParams.total,
      totalParams: noOfParams,
    };
  }

  async hasMWsChanged({
    soClient,
    lastStartedAt,
    lastTotalMWs,
  }: {
    soClient: SavedObjectsClientContract;
    lastStartedAt: string;
    lastTotalMWs: number;
  }) {
    const { logger } = this.serverSetup;

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

    return {
      hasMWsChanged,
      updatedMWs,
      totalMWs: noOfMWs,
    };
  }

  debugLog = (message: string) => {
    this.serverSetup.logger.debug(`[SyncPrivateLocationMonitorsTask] ${message} `);
  };

  async cleanUpDuplicatedPackagePolicies(
    soClient: SavedObjectsClientContract,
    taskState: TaskState
  ) {
    let performSync = false;

    if (taskState.hasAlreadyDoneCleanup) {
      this.debugLog(
        'Skipping cleanup of duplicated package policies as it has already been done once'
      );
      return { performSync };
    } else if (taskState.maxCleanUpRetries <= 0) {
      this.debugLog(
        'Skipping cleanup of duplicated package policies as max retries have been reached'
      );
      taskState.hasAlreadyDoneCleanup = true;
      taskState.maxCleanUpRetries = 3;
      return { performSync };
    }
    this.debugLog('Starting cleanup of duplicated package policies');
    const { fleet } = this.serverSetup.pluginsStart;
    const { logger } = this.serverSetup;

    try {
      const esClient = this.serverSetup.coreStart?.elasticsearch?.client.asInternalUser;

      const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
        type: syntheticsMonitorSOTypes,
        fields: ['id', 'name', 'locations', 'origin'],
        namespaces: ['*'],
      });

      const privateLocationAPI = new SyntheticsPrivateLocation(this.serverSetup);

      const expectedPackagePolicies = new Set<string>();
      for await (const result of finder.find()) {
        result.saved_objects.forEach((monitor) => {
          monitor.attributes.locations?.forEach((location) => {
            const spaceId = monitor.namespaces?.[0];
            if (!location.isServiceManaged && spaceId) {
              const policyId = privateLocationAPI.getPolicyId(
                {
                  origin: monitor.attributes.origin,
                  id: monitor.id,
                },
                location.id,
                spaceId
              );
              expectedPackagePolicies.add(policyId);
            }
          });
        });
      }

      finder.close().catch(() => {});

      const packagePoliciesKuery = getFilterForTestNowRun(true);

      const policiesIterator = await fleet.packagePolicyService.fetchAllItemIds(soClient, {
        kuery: packagePoliciesKuery,
        spaceIds: ['*'],
        perPage: 100,
      });
      const packagePoliciesToDelete: string[] = [];

      for await (const packagePoliciesIds of policiesIterator) {
        for (const packagePolicyId of packagePoliciesIds) {
          if (!expectedPackagePolicies.has(packagePolicyId)) {
            packagePoliciesToDelete.push(packagePolicyId);
          }
          // remove it from the set to mark it as found
          expectedPackagePolicies.delete(packagePolicyId);
        }
      }

      // if we have any to delete or any expected that were not found we need to perform a sync
      performSync = packagePoliciesToDelete.length > 0 || expectedPackagePolicies.size > 0;

      if (packagePoliciesToDelete.length > 0) {
        logger.info(
          ` [PrivateLocationCleanUpTask] Found ${
            packagePoliciesToDelete.length
          } duplicate package policies to delete: ${packagePoliciesToDelete.join(', ')}`
        );
        await fleet.packagePolicyService.delete(soClient, esClient, packagePoliciesToDelete, {
          force: true,
          spaceIds: ['*'],
        });
      }
      taskState.hasAlreadyDoneCleanup = true;
      taskState.maxCleanUpRetries = 3;
      return { performSync };
    } catch (e) {
      taskState.maxCleanUpRetries -= 1;
      if (taskState.maxCleanUpRetries <= 0) {
        this.debugLog(
          'Skipping cleanup of duplicated package policies as max retries have been reached'
        );
        taskState.hasAlreadyDoneCleanup = true;
        taskState.maxCleanUpRetries = 3;
      }
      logger.error(
        '[SyncPrivateLocationMonitorsTask] Error cleaning up duplicated package policies',
        { error: e }
      );
      return { performSync };
    }
  }
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
