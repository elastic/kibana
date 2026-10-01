/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { chunk } from 'lodash';
import pMap from 'p-map';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { getSavedObjectKqlFilter } from '../../common';
import type { RouteContext } from '../../types';
import { getPrivateLocationsForNamespaces } from '../../../synthetics_service/get_private_locations';
import type { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import type { MonitorFields, SyntheticsMonitor } from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import { MonitorValidationError, normalizeAPIConfig, validateMonitor } from '../monitor_validation';
import { AddEditMonitorAPI, type CreateMonitorPayLoad } from '../add_monitor/add_monitor_api';
import { validatePermissions } from '../edit_monitor';
import {
  assertCanPerformMonitorBulkActionInAllSpaces,
  validateMonitorPrivateLocationSpaces,
} from '../monitor_locations_utils';

const MONITOR_NAME_QUERY_BATCH_SIZE = 100;
const MONITOR_NAME_QUERY_CONCURRENCY = 4;

export interface BulkCreatePreprocessResult {
  normalizedMonitors: SyntheticsMonitor[];
  privateLocations: PrivateLocationAttributes[];
  maintenanceWindows: MaintenanceWindow[];
}

/** Prepares every monitor before the shared Saved Objects and Fleet bulk write. */
export class CreateMonitorBulkAPI {
  constructor(private readonly routeContext: RouteContext) {}

  async prepare(monitors: CreateMonitorPayLoad[]): Promise<BulkCreatePreprocessResult> {
    this.validateOrigins(monitors);

    const formattedMonitors = monitors.map((monitor) => this.formatMonitor(monitor));
    const [privateLocations, maintenanceWindows] = await Promise.all([
      this.getPrivateLocations(formattedMonitors),
      this.getMaintenanceWindows(formattedMonitors),
    ]);
    const normalizedMonitors = await this.normalizeMonitors(
      formattedMonitors,
      maintenanceWindows,
      privateLocations
    );

    this.validateUniqueNames(normalizedMonitors);
    await this.validateNamesDoNotExist(normalizedMonitors);

    return {
      normalizedMonitors: normalizedMonitors.map((monitor) => this.includeRequestSpace(monitor)),
      privateLocations,
      maintenanceWindows,
    };
  }

  /** Validates the public-location, multi-space, and private-location access requirements. */
  async validateCreateAccess({
    normalizedMonitors,
    privateLocations,
  }: BulkCreatePreprocessResult): Promise<IKibanaResponse | undefined> {
    const { response } = this.routeContext;
    const locationPermissionError = await validatePermissions(
      this.routeContext,
      normalizedMonitors.flatMap((monitor) => monitor[ConfigKey.LOCATIONS])
    );
    if (locationPermissionError) {
      return response.forbidden({ body: { message: locationPermissionError } });
    }

    const monitorSpaces = [
      ...new Set(normalizedMonitors.flatMap((monitor) => monitor[ConfigKey.KIBANA_SPACES] ?? [])),
    ];
    const spacePermissionError = await assertCanPerformMonitorBulkActionInAllSpaces(
      this.routeContext,
      monitorSpaces,
      undefined,
      'bulk_create'
    );
    if (spacePermissionError) {
      return spacePermissionError;
    }

    const privateLocationsById = new Map(
      privateLocations.map((privateLocation) => [privateLocation.id, privateLocation])
    );
    for (const monitor of normalizedMonitors) {
      const privateLocationSpaceError = validateMonitorPrivateLocationSpaces(
        monitor as MonitorFields,
        privateLocationsById
      );
      if (privateLocationSpaceError) {
        return response.badRequest({
          body: {
            message: privateLocationSpaceError.message,
            attributes: privateLocationSpaceError.attributes,
          },
        });
      }
    }
  }

  private validateOrigins(monitors: CreateMonitorPayLoad[]) {
    const invalidMonitor = monitors.find((monitor) => monitor.origin && monitor.origin !== 'ui');
    if (invalidMonitor) {
      throw bulkCreateValidationError(
        `Unsupported origin type ${invalidMonitor.origin}, only ui type is supported via API.`
      );
    }
  }

  private formatMonitor(monitor: CreateMonitorPayLoad): CreateMonitorPayLoad {
    const { errorMessage, formattedConfig } = normalizeAPIConfig(monitor);
    if (errorMessage || !formattedConfig) {
      throw bulkCreateValidationError(errorMessage ?? 'Unable to normalize monitor configuration');
    }
    return formattedConfig as CreateMonitorPayLoad;
  }

  private async getPrivateLocations(monitors: CreateMonitorPayLoad[]) {
    if (!monitors.some((monitor) => this.hasPrivateLocationInput(monitor))) {
      return [];
    }

    const namespaces = new Set<string>([this.routeContext.spaceId]);
    for (const monitor of monitors) {
      for (const space of monitor[ConfigKey.KIBANA_SPACES] ?? []) {
        namespaces.add(space);
      }
    }

    const internalClient =
      this.routeContext.server.coreStart.savedObjects.createInternalRepository();
    return getPrivateLocationsForNamespaces(internalClient, [...namespaces]);
  }

  private hasPrivateLocationInput(monitor: CreateMonitorPayLoad): boolean {
    if ((monitor.private_locations?.length ?? 0) > 0) {
      return true;
    }
    return (monitor.locations ?? []).some(
      (location) => typeof location !== 'string' && !location.isServiceManaged
    );
  }

  private async getMaintenanceWindows(monitors: CreateMonitorPayLoad[]) {
    const needsMaintenanceWindows = monitors.some(
      (monitor) => (monitor[ConfigKey.MAINTENANCE_WINDOWS]?.length ?? 0) > 0
    );
    if (!needsMaintenanceWindows) {
      return [];
    }
    return (
      (await this.routeContext.syntheticsMonitorClient.syntheticsService.getMaintenanceWindows(
        this.routeContext.spaceId
      )) ?? []
    );
  }

  private async normalizeMonitors(
    monitors: CreateMonitorPayLoad[],
    maintenanceWindows: MaintenanceWindow[],
    privateLocations: PrivateLocationAttributes[]
  ) {
    const normalizedMonitors: SyntheticsMonitor[] = [];
    for (const monitor of monitors) {
      const addMonitorAPI = new AddEditMonitorAPI(this.routeContext);
      const normalizedMonitor = await addMonitorAPI.normalizeMonitor(
        monitor,
        monitor,
        undefined,
        maintenanceWindows,
        privateLocations
      );
      const validation = validateMonitor(
        normalizedMonitor,
        this.routeContext.spaceId,
        this.routeContext.server.cloud?.isServerlessEnabled
      );
      if (!validation.valid || !validation.decodedMonitor) {
        throw bulkCreateValidationError(validation.reason, validation.details);
      }
      normalizedMonitors.push(validation.decodedMonitor);
    }
    return normalizedMonitors;
  }

  private validateUniqueNames(monitors: SyntheticsMonitor[]) {
    const seenNames = new Set<string>();
    for (const monitor of monitors) {
      const name = monitor[ConfigKey.NAME];
      if (seenNames.has(name)) {
        throw bulkCreateValidationError(monitorNameExistsMessage(name));
      }
      seenNames.add(name);
    }
  }

  private async validateNamesDoNotExist(monitors: SyntheticsMonitor[]) {
    const names = monitors.map((monitor) => monitor[ConfigKey.NAME]);
    const { monitorConfigRepository } = this.routeContext;

    const existingNames = await pMap(
      chunk(names, MONITOR_NAME_QUERY_BATCH_SIZE),
      async (nameBatch) => {
        const filter = getSavedObjectKqlFilter({ field: 'name.keyword', values: nameBatch });
        const { saved_objects: existingMonitors = [], total } = await monitorConfigRepository.find<
          Pick<MonitorFields, ConfigKey.NAME>
        >({
          perPage: 1,
          fields: [ConfigKey.NAME],
          filter,
        });
        return total > 0
          ? existingMonitors[0]?.attributes[ConfigKey.NAME] ?? nameBatch[0]
          : undefined;
      },
      { concurrency: MONITOR_NAME_QUERY_CONCURRENCY }
    );
    const existingName = existingNames.find(Boolean);
    if (existingName) {
      throw bulkCreateValidationError(monitorNameExistsMessage(existingName));
    }
  }

  private includeRequestSpace(monitor: SyntheticsMonitor): SyntheticsMonitor {
    const spaces = monitor[ConfigKey.KIBANA_SPACES] ?? [];
    return {
      ...monitor,
      [ConfigKey.KIBANA_SPACES]: spaces.includes(this.routeContext.spaceId)
        ? spaces
        : [...spaces, this.routeContext.spaceId],
    };
  }
}

const monitorNameExistsMessage = (name: string) =>
  `Monitor name must be unique, "${name}" already exists.`;

const bulkCreateValidationError = (reason: string, details: string = reason) =>
  new MonitorValidationError({
    valid: false,
    reason,
    details,
    payload: {},
  });
