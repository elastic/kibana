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
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/server/application/types';
import {
  legacyMonitorAttributes,
  syntheticsMonitorAttributes,
  syntheticsMonitorSOTypes,
} from '../../common/types/saved_objects';
import { normalizeSecrets } from '../synthetics_service/utils';
import type { PrivateLocationAttributes } from '../runtime_types/private_locations';
import type {
  HeartbeatConfig,
  MonitorFields,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../common/runtime_types';
import { ConfigKey } from '../../common/runtime_types';
import { MonitorConfigRepository } from '../services/monitor_config_repository';
import type { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import type { SyntheticsServerSetup } from '../types';
import {
  formatHeartbeatRequest,
  mixParamsWithGlobalParams,
} from '../synthetics_service/formatters/public_formatters/format_configs';

interface SyncConfig {
  config: HeartbeatConfig;
  globalParams: Record<string, string>;
}

export class DeployPrivateLocationMonitors {
  constructor(
    public serverSetup: SyntheticsServerSetup,
    public syntheticsMonitorClient: SyntheticsMonitorClient
  ) {}

  async syncPackagePoliciesForMws({
    allPrivateLocations,
    updatedMWs,
    missingMWIds,
    soClient,
    maintenanceWindows,
  }: {
    maintenanceWindows: MaintenanceWindow[];
    updatedMWs?: MaintenanceWindow[];
    missingMWIds?: string[];
    soClient: SavedObjectsClientContract;
    allPrivateLocations: PrivateLocationAttributes[];
  }) {
    if (allPrivateLocations.length === 0) {
      this.debugLog('No private locations found, skipping sync of private location monitors');
      return;
    }
    const { syntheticsService } = this.syntheticsMonitorClient;

    const paramsBySpace = await syntheticsService.getSyntheticsParams({
      spaceId: ALL_SPACES_ID,
    });

    // config can have multiple mws, so we need to track which configs have been updated to avoid duplicate processing
    const listOfUpdatedConfigs: Array<string> = [];

    return this.serverSetup.fleet.runWithCache(async () => {
      const commonProps = {
        listOfUpdatedConfigs,
        allPrivateLocations,
        maintenanceWindows,
        soClient,
        paramsBySpace,
      };
      for (const mw of updatedMWs || []) {
        await this.updateMonitorsForMw({
          ...commonProps,
          mwId: mw.id,
        });
      }

      for (const mwId of missingMWIds || []) {
        await this.updateMonitorsForMw({
          ...commonProps,
          mwId,
          isMissingMw: true,
        });
      }
    });
  }

  async updateMonitorsForMw({
    listOfUpdatedConfigs,
    allPrivateLocations,
    mwId,
    maintenanceWindows,
    soClient,
    paramsBySpace,
    isMissingMw = false,
  }: {
    mwId: string;
    maintenanceWindows: MaintenanceWindow[];
    missingMWIds?: string[];
    soClient: SavedObjectsClientContract;
    allPrivateLocations: PrivateLocationAttributes[];
    paramsBySpace: Record<string, Record<string, string>>;
    listOfUpdatedConfigs: Array<string>;
    isMissingMw?: boolean;
  }) {
    const {
      pluginsStart: { encryptedSavedObjects },
    } = this.serverSetup;
    const encryptedClient = encryptedSavedObjects.getClient();

    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        {
          type: syntheticsMonitorSOTypes,
          perPage: 500,
          namespaces: ['*'],
          // TODO: Exclude public monitors
          filter: `${syntheticsMonitorAttributes}.${ConfigKey.MAINTENANCE_WINDOWS}: "${mwId}" or ${legacyMonitorAttributes}.${ConfigKey.MAINTENANCE_WINDOWS}: "${mwId}"`,
        }
      );

    for await (const result of finder.find()) {
      const monitors = result.saved_objects.filter((monitor) => {
        // Avoid processing the same config multiple times, updating it once will update all mws on it
        if (listOfUpdatedConfigs.includes(monitor.id)) {
          this.debugLog(
            `Skipping monitor id: ${monitor.id} as it has already been processed for another maintenance window`
          );
          return false;
        }
        listOfUpdatedConfigs.push(monitor.id);
        return true;
      });
      this.debugLog(`Processing mw id: ${mwId}, monitors count: ${monitors?.length ?? 0}`);

      const { configsBySpaces, monitorSpaceIds } = this.mixParamsWithMonitors(
        monitors,
        paramsBySpace
      );

      await this.deployEditMonitors({
        allPrivateLocations,
        configsBySpaces,
        monitorSpaceIds,
        paramsBySpace,
        maintenanceWindows,
      });

      if (isMissingMw) {
        await this.removeMwsFromMonitorConfigs({
          mwId,
          monitors,
          soClient,
        });
      }
    }

    finder.close().catch(() => {});

    this.debugLog(`Syncing package policies for updated maintenance window id: ${mwId}`);
  }

  async syncAllPackagePolicies({
    allPrivateLocations,
    encryptedSavedObjects,
    soClient,
    spaceIdToSync,
    privateLocationId,
  }: {
    privateLocationId?: string;
    spaceIdToSync?: string;
    soClient: SavedObjectsClientContract;
    allPrivateLocations: PrivateLocationAttributes[];
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  }) {
    if (allPrivateLocations.length === 0) {
      this.debugLog('No private locations found, skipping sync of private location monitors');
      return;
    }

    const { configsBySpaces, paramsBySpace, monitorSpaceIds, maintenanceWindows } =
      await this.getAllMonitorConfigs({
        encryptedSavedObjects,
        soClient,
        privateLocationId,
        spaceId: spaceIdToSync,
      });

    return this.serverSetup.fleet.runWithCache(async () => {
      this.debugLog(
        `Starting sync of private location monitors for spaces: ${Array.from(monitorSpaceIds).join(
          ', '
        )}`
      );
      await this.deployEditMonitors({
        allPrivateLocations: allPrivateLocations.filter(
          (loc) => loc.id === privateLocationId || !privateLocationId
        ),
        configsBySpaces,
        monitorSpaceIds,
        paramsBySpace,
        maintenanceWindows,
      });
      this.debugLog('Completed sync of private location monitors');
    });
  }

  async deployEditMonitors({
    allPrivateLocations,
    configsBySpaces,
    monitorSpaceIds,
    paramsBySpace,
    maintenanceWindows,
  }: {
    allPrivateLocations: PrivateLocationAttributes[];
    configsBySpaces: Record<string, HeartbeatConfig[]>;
    monitorSpaceIds: Set<string>;
    paramsBySpace: Record<string, Record<string, string>>;
    maintenanceWindows: MaintenanceWindow[];
  }) {
    const { privateLocationAPI } = this.syntheticsMonitorClient;

    for (const spaceId of monitorSpaceIds) {
      const privateConfigs: Array<SyncConfig> = [];
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
    spaceId = ALL_SPACES_ID,
    privateLocationId,
  }: {
    soClient: SavedObjectsClientContract;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    spaceId?: string;
    privateLocationId?: string;
  }) {
    const { syntheticsService } = this.syntheticsMonitorClient;
    const paramsBySpacePromise = syntheticsService.getSyntheticsParams({ spaceId });
    const maintenanceWindowsPromise = syntheticsService.getMaintenanceWindows(spaceId);
    const monitorConfigRepository = new MonitorConfigRepository(
      soClient,
      encryptedSavedObjects.getClient()
    );

    const monitorsPromise = monitorConfigRepository.findDecryptedMonitors({
      spaceId,
      ...(privateLocationId && {
        filter: `${syntheticsMonitorAttributes}.locations.id:"${privateLocationId}"`,
      }),
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

  removeMwsFromMonitorConfigs = async ({
    mwId,
    monitors,
    soClient,
  }: {
    mwId: string;
    monitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>>;
    soClient: SavedObjectsClientContract;
  }) => {
    this.debugLog(
      `Removing maintenance window id: ${mwId} from monitors count: ${monitors?.length ?? 0}`
    );
    const toUpdateMonitors = monitors.map((monitor) => {
      const existingMws = monitor.attributes[ConfigKey.MAINTENANCE_WINDOWS] || [];
      const updatedMws = existingMws.filter((id) => id !== mwId);
      return {
        id: monitor.id,
        type: monitor.type,
        attributes: {
          [ConfigKey.MAINTENANCE_WINDOWS]: updatedMws,
        },
        namespace: monitor.namespaces?.[0],
      };
    });

    const result = await soClient.bulkUpdate(toUpdateMonitors);
    this.debugLog(
      `Removed maintenance window id: ${mwId} from monitors, updated monitors count: ${result.saved_objects.length}`
    );
  };
}
