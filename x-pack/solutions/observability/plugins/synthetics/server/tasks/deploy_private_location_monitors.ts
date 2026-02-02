/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { normalizeSecrets } from '../synthetics_service/utils';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type {
  HeartbeatConfig,
  MonitorFields,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';
import { MonitorConfigRepository } from '../services/monitor_config_repository';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import type { SyntheticsServerSetup } from '../types';
import {
  formatHeartbeatRequest,
  mixParamsWithGlobalParams,
} from '../synthetics_service/formatters/public_formatters/format_configs';

export class DeployPrivateLocationMonitors {
  constructor(
    public serverSetup: SyntheticsServerSetup,
    public syntheticsMonitorClient: SyntheticsMonitorClient
  ) {}

  async syncPackagePolicies({
    allPrivateLocations,
    encryptedSavedObjects,
    soClient,
    spaceIdToSync,
  }: {
    spaceIdToSync?: string;
    soClient: SavedObjectsClientContract;
    allPrivateLocations: PrivateLocationAttributes[];
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  }) {
    if (allPrivateLocations.length === 0) {
      this.debugLog('No private locations found, skipping sync of private location monitors');
      return;
    }

    const { privateLocationAPI } = this.syntheticsMonitorClient;

    const { configsBySpaces, paramsBySpace, monitorSpaceIds, maintenanceWindows } =
      await this.getAllMonitorConfigs({
        encryptedSavedObjects,
        soClient,
        spaceId: spaceIdToSync,
      });

    return this.serverSetup.fleet.runWithCache(async () => {
      this.debugLog(
        `Starting sync of private location monitors for spaces: ${Array.from(monitorSpaceIds).join(
          ', '
        )}`
      );
      for (const spaceId of monitorSpaceIds) {
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
    });
  }

  async getAllMonitorConfigs({
    soClient,
    encryptedSavedObjects,
    spaceId = ALL_SPACES_ID,
  }: {
    soClient: SavedObjectsClientContract;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    spaceId?: string;
  }) {
    const { syntheticsService } = this.syntheticsMonitorClient;
    const paramsBySpacePromise = syntheticsService.getSyntheticsParams({ spaceId });
    const maintenanceWindowsPromise = syntheticsService.getMaintenanceWindows();
    const monitorConfigRepository = new MonitorConfigRepository(
      soClient,
      encryptedSavedObjects.getClient()
    );

    const monitorsPromise = monitorConfigRepository.findDecryptedMonitors({
      spaceId,
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
    const monitorSpaceIds = new Set<string>();

    for (const monitor of monitors) {
      const spaceId = monitor.namespaces?.[0];
      if (!spaceId) {
        continue;
      }
      monitorSpaceIds.add(spaceId);
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

    return { configsBySpaces, monitorSpaceIds };
  }

  debugLog = (message: string) => {
    this.serverSetup.logger.debug(`[DeployPrivateLocationMonitors] ${message}`);
  };
}
