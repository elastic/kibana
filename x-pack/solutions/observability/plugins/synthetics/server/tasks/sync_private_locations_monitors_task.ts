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

interface TaskState extends Record<string, unknown> {
  lastStartedAt: string;
  lastTotalParams: number;
}

type CustomTaskInstance = Omit<ConcreteTaskInstance, 'state'> & { state: Partial<TaskState> };

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
    try {
      logger.debug(
        `Syncing private location monitors, last total params ${lastTotalParams}, last run ${lastStartedAt}`
      );
      const soClient = savedObjects.createInternalRepository();
      const allPrivateLocations = await getPrivateLocations(soClient);
      const { updatedParams, totalParams } = await this.hasAnyParamChanged(soClient, lastStartedAt);
      if (updatedParams > 0 || totalParams !== lastTotalParams) {
        lastTotalParams = totalParams;
        logger.debug(
          `Syncing private location monitors because params changed, updated params ${updatedParams}, total params ${totalParams}`
        );

        if (allPrivateLocations.length > 0) {
          await this.syncGlobalParams({
            allPrivateLocations,
            soClient,
            encryptedSavedObjects,
          });
        }
        logger.debug(`Sync of private location monitors succeeded`);
      } else {
        lastTotalParams = totalParams;
        logger.debug(
          `No params changed since last run ${lastStartedAt}, skipping sync of private location monitors`
        );
      }
    } catch (error) {
      logger.error(`Sync of private location monitors failed: ${error.message}`);
      return {
        error,
        state: {
          lastStartedAt: startedAt.toISOString(),
          lastTotalParams,
        },
      };
    }
    return {
      state: {
        lastStartedAt: startedAt.toISOString(),
        lastTotalParams,
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
        interval: '10m',
      },
      taskType: TASK_TYPE,
      params: {},
    });
    logger.debug(`Sync private location monitors task scheduled successfully`);
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

    const { configsBySpaces, paramsBySpace, spaceIds } = await this.getAllMonitorConfigs({
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
        await privateLocationAPI.editMonitors(privateConfigs, allPrivateLocations, spaceId);
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
    const monitorConfigRepository = new MonitorConfigRepository(
      soClient,
      encryptedSavedObjects.getClient()
    );

    const monitorsPromise = monitorConfigRepository.findDecryptedMonitors({
      spaceId: ALL_SPACES_ID,
    });

    const [paramsBySpace, monitors] = await Promise.all([paramsBySpacePromise, monitorsPromise]);

    return {
      ...this.mixParamsWithMonitors(monitors, paramsBySpace),
      paramsBySpace,
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

  async hasAnyParamChanged(soClient: SavedObjectsClientContract, lastStartedAt: string) {
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
    logger.debug(`Found ${editedParams.total} params and ${totalParams.total} total params`);
    return {
      updatedParams: editedParams.total,
      totalParams: totalParams.total,
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
      `Error scheduling Synthetics sync private location monitors task: ${error.message}`
    );
  }
};
