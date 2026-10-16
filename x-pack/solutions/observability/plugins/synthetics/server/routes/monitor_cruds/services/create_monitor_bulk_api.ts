/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { uniqBy } from 'lodash';
import type { RouteContext } from '../../types';
import { getPrivateLocationsForNamespaces } from '../../../synthetics_service/get_private_locations';
import type { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import type { MonitorFields, SyntheticsMonitor } from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import { MonitorValidationError, normalizeAPIConfig, validateMonitor } from '../monitor_validation';
import { AddEditMonitorAPI, type CreateMonitorPayLoad } from '../add_monitor/add_monitor_api';
import { invalidOriginError } from '../add_monitor';
import { validatePermissions } from '../edit_monitor';
import {
  assertCanPerformMonitorBulkActionInAllSpaces,
  validateMonitorPrivateLocationSpaces,
} from '../monitor_locations_utils';

export interface BulkCreatePreprocessResult {
  normalizedMonitors: SyntheticsMonitor[];
  privateLocations: PrivateLocationAttributes[];
  maintenanceWindows: MaintenanceWindow[];
}

/** Prepares every monitor before the shared Saved Objects and Fleet bulk write. */
export class CreateMonitorBulkAPI {
  constructor(private readonly routeContext: RouteContext) {}

  /** Validates that the caller may create monitors in every requested space. */
  async validateRequestedSpacesAccess(
    monitors: CreateMonitorPayLoad[]
  ): Promise<IKibanaResponse | undefined> {
    const monitorSpaces = [
      ...new Set(monitors.flatMap((monitor) => monitor[ConfigKey.KIBANA_SPACES] ?? [])),
    ];
    return assertCanPerformMonitorBulkActionInAllSpaces(
      this.routeContext,
      monitorSpaces,
      undefined,
      'bulk_create'
    );
  }

  async prepare(monitors: CreateMonitorPayLoad[]): Promise<BulkCreatePreprocessResult> {
    this.validateOrigins(monitors);

    const formattedMonitors = monitors.map((monitor) => this.formatMonitor(monitor));
    const [privateLocationsByMonitor, maintenanceWindows] = await Promise.all([
      this.getPrivateLocationsForMonitors(formattedMonitors),
      this.getMaintenanceWindows(formattedMonitors),
    ]);
    const normalizedMonitors = await this.normalizeMonitors(
      formattedMonitors,
      maintenanceWindows,
      privateLocationsByMonitor
    );
    const privateLocations = uniqBy(privateLocationsByMonitor.flat(), 'id');

    this.validateUniqueNames(normalizedMonitors);
    await this.validateNamesDoNotExist(normalizedMonitors);

    return {
      normalizedMonitors: normalizedMonitors.map((monitor) => this.includeRequestSpace(monitor)),
      privateLocations,
      maintenanceWindows,
    };
  }

  /** Validates public-location capability and private-location space coverage. */
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
      throw bulkCreateValidationError(invalidOriginError(invalidMonitor.origin!));
    }
  }

  private formatMonitor(monitor: CreateMonitorPayLoad): CreateMonitorPayLoad {
    const { errorMessage, formattedConfig } = normalizeAPIConfig(monitor);
    if (errorMessage || !formattedConfig) {
      throw bulkCreateValidationError(errorMessage ?? 'Unable to normalize monitor configuration');
    }
    return formattedConfig as CreateMonitorPayLoad;
  }

  private async getPrivateLocationsForMonitors(monitors: CreateMonitorPayLoad[]) {
    if (!monitors.some((monitor) => this.hasPrivateLocationInput(monitor))) {
      return monitors.map(() => []);
    }

    const internalClient =
      this.routeContext.server.coreStart.savedObjects.createInternalRepository();
    const privateLocationsByNamespaceScope = new Map<
      string,
      Promise<PrivateLocationAttributes[]>
    >();
    return Promise.all(
      monitors.map((monitor) => {
        if (!this.hasPrivateLocationInput(monitor)) {
          return [];
        }
        const namespaces = [
          ...new Set([this.routeContext.spaceId, ...(monitor[ConfigKey.KIBANA_SPACES] ?? [])]),
        ];
        const namespaceScope = JSON.stringify([...namespaces].sort());
        let privateLocations = privateLocationsByNamespaceScope.get(namespaceScope);
        if (!privateLocations) {
          privateLocations = getPrivateLocationsForNamespaces(internalClient, namespaces);
          privateLocationsByNamespaceScope.set(namespaceScope, privateLocations);
        }
        return privateLocations;
      })
    );
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
    privateLocationsByMonitor: PrivateLocationAttributes[][]
  ) {
    const normalizedMonitors: SyntheticsMonitor[] = [];
    for (const [index, monitor] of monitors.entries()) {
      const addMonitorAPI = new AddEditMonitorAPI(this.routeContext);
      const normalizedMonitor = await addMonitorAPI.normalizeMonitor(
        monitor,
        monitor,
        undefined,
        maintenanceWindows,
        privateLocationsByMonitor[index]
      );
      const validation = validateMonitor(
        normalizedMonitor,
        this.routeContext.spaceId,
        this.routeContext.server.cloud?.isServerlessEnabled
      );
      if (!validation.valid || !validation.decodedMonitor) {
        throw bulkCreateValidationError(
          `Invalid monitor "${monitor[ConfigKey.NAME]}": ${validation.reason}`,
          validation.details
        );
      }
      normalizedMonitors.push(validation.decodedMonitor);
    }
    return normalizedMonitors;
  }

  private validateUniqueNames(monitors: SyntheticsMonitor[]) {
    const seenNames = new Set<string>();
    for (const monitor of monitors) {
      const name = monitor[ConfigKey.NAME];
      const normalizedName = name.toLowerCase();
      if (seenNames.has(normalizedName)) {
        throw bulkCreateValidationError(monitorNameExistsMessage(name));
      }
      seenNames.add(normalizedName);
    }
  }

  private async validateNamesDoNotExist(monitors: SyntheticsMonitor[]) {
    const names = monitors.map((monitor) => monitor[ConfigKey.NAME]);
    const { monitorConfigRepository } = this.routeContext;

    const existingName = await monitorConfigRepository.findExistingMonitorName(
      names,
      this.routeContext.spaceId
    );
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
