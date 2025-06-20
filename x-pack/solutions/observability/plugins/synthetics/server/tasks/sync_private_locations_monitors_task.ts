/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server/plugin';
import {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/common';
import { syntheticsParamType } from '../../common/types/saved_objects';
import { normalizeSecrets } from '../synthetics_service/utils';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import {
  HeartbeatConfig,
  MonitorFields,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';
import { MonitorConfigRepository } from '../services/monitor_config_repository';
import { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';
import { SyntheticsServerSetup } from '../types';
import {
  formatHeartbeatRequest,
  mixParamsWithGlobalParams,
} from '../synthetics_service/formatters/public_formatters/format_configs';

const TASK_TYPE = 'Synthetics:Sync-Private-Location-Monitors';
const TASK_ID = `${TASK_TYPE}-single-instance`;
const TASK_SCHEDULE = '5m';

interface TaskState extends Record<string, unknown> {
  lastStartedAt: string;
  lastTotalParams: number;
  lastTotalMWs: number;
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
    let lastTotalParams = taskInstance.state.lastTotalParams || 0;
    let lastTotalMWs = taskInstance.state.lastTotalMWs || 0;
    try {
      logger.debug(
        `Syncing private location monitors, last total params ${lastTotalParams}, last run ${lastStartedAt}`
      );
      const soClient = savedObjects.createInternalRepository([
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      ]);
      const allPrivateLocations = await getPrivateLocations(soClient);
      const { totalMWs, totalParams, hasDataChanged } = await this.hasAnyDataChanged({
        soClient,
        taskInstance,
      });
      lastTotalParams = totalParams;
      lastTotalMWs = totalMWs;
      if (hasDataChanged) {
        logger.debug(`Syncing private location monitors because data has changed`);

        if (allPrivateLocations.length > 0) {
          await this.syncGlobalParams({
            allPrivateLocations,
            soClient,
            encryptedSavedObjects,
          });
        }
        logger.debug(`Sync of private location monitors succeeded`);
      } else {
        logger.debug(
          `No data has changed since last run ${lastStartedAt}, skipping sync of private location monitors`
        );
      }
    } catch (error) {
      logger.error(`Sync of private location monitors failed: ${error.message}`);
      return {
        error,
        state: {
          lastStartedAt: startedAt.toISOString(),
          lastTotalParams,
          lastTotalMWs,
        },
      };
    }
    return {
      state: {
        lastStartedAt: startedAt.toISOString(),
        lastTotalParams,
        lastTotalMWs,
      },
    };
  }

  start = async () => {
    const {
      logger,
      pluginsStart: { taskManager },
    } = this.serverSetup;
    logger.debug(`Scheduling private location task`);
    await taskManager.ensureScheduled({
      id: TASK_ID,
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
    taskInstance,
    soClient,
  }: {
    taskInstance: CustomTaskInstance;
    soClient: SavedObjectsClientContract;
  }) => {
    const lastStartedAt =
      taskInstance.state.lastStartedAt || moment().subtract(10, 'minute').toISOString();
    const lastTotalParams = taskInstance.state.lastTotalParams || 0;
    const lastTotalMWs = taskInstance.state.lastTotalMWs || 0;

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
    const hasDataChanged = hasMWsChanged || hasParamsChanges;
    return { hasDataChanged, totalParams, totalMWs };
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
    const privateConfigs: Array<{ config: HeartbeatConfig; globalParams: Record<string, string> }> =
      [];

    const { configsBySpaces, paramsBySpace, spaceIds, maintenanceWindows } =
      await this.getAllMonitorConfigs({
        encryptedSavedObjects,
        soClient,
      });

    for (const spaceId of spaceIds) {
      const monitors = configsBySpaces[spaceId];
      if (!monitors) {
        continue;
      }
      for (const monitor of monitors) {
        const { privateLocations } = this.parseLocations(monitor);

        if (privateLocations.length > 0) {
          privateConfigs.push({ config: monitor, globalParams: paramsBySpace[monitor.namespace] });
        }
      }
      if (privateConfigs.length > 0) {
        await privateLocationAPI.editMonitors(
          privateConfigs,
          allPrivateLocations,
          spaceId,
          maintenanceWindows
        );
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
}

export const runSynPrivateLocationMonitorsTaskSoon = async ({
  server,
}: {
  server: SyntheticsServerSetup;
}) => {
  const {
    logger,
    pluginsStart: { taskManager },
  } = server;
  try {
    logger.debug(`Scheduling Synthetics sync private location monitors task soon`);
    await taskManager.runSoon(TASK_ID);
    logger.debug(`Synthetics sync private location task scheduled successfully`);
  } catch (error) {
    logger.error(
      `Error scheduling Synthetics sync private location monitors task: ${error.message}`,
      { error }
    );
  }
};
