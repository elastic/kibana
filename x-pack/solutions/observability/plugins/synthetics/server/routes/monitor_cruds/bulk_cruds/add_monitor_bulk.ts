/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import pMap from 'p-map';
import type { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import { v4 as uuidV4 } from 'uuid';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { getPackagePolicySavedObjectType } from '@kbn/fleet-plugin/server/services/package_policy';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { SyntheticsServerSetup } from '../../../types';
import type { RouteContext } from '../../types';
import { formatTelemetryEvent, sendTelemetryEvents } from '../../telemetry/monitor_upgrade_sender';
import type {
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  ServiceLocationErrors,
  SyntheticsMonitor,
} from '../../../../common/runtime_types';
import { ConfigKey, type SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import { DeleteMonitorAPI } from '../services/delete_monitor_api';
import { AddEditMonitorAPI, isPackagePolicyConflictFailure } from '../add_monitor/add_monitor_api';

type MonitorSavedObject = SavedObject<EncryptedSyntheticsMonitorAttributes>;

type CreatedMonitors =
  SavedObjectsBulkResponse<EncryptedSyntheticsMonitorAttributes>['saved_objects'];

export const syncNewMonitorBulk = async ({
  routeContext,
  normalizedMonitors,
  privateLocations,
  maintenanceWindows,
  spaceId,
  hydrateNamespace = false,
}: {
  routeContext: RouteContext;
  normalizedMonitors: SyntheticsMonitor[];
  privateLocations: SyntheticsPrivateLocations;
  maintenanceWindows?: MaintenanceWindow[];
  spaceId: string;
  hydrateNamespace?: boolean;
}) => {
  const { server, syntheticsMonitorClient, monitorConfigRepository, request } = routeContext;
  const { query } = request;
  let newMonitors: CreatedMonitors | null = null;

  const packagePolicySoType = await getPackagePolicySavedObjectType();
  const monitorsToCreate = normalizedMonitors.map((monitor) => {
    const monitorSavedObjectId = uuidV4();
    const monitorWithIds = {
      ...monitor,
      [ConfigKey.MONITOR_QUERY_ID]: monitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || monitorSavedObjectId,
      [ConfigKey.CONFIG_ID]: monitorSavedObjectId,
    } as SyntheticsMonitor;
    const monitorWithNamespace = hydrateNamespace
      ? new AddEditMonitorAPI(routeContext).hydrateMonitorFields({
          normalizedMonitor: monitor,
          newMonitorId: monitorSavedObjectId,
        })
      : monitorWithIds;
    const monitorPrivateLocations = monitorWithNamespace[ConfigKey.LOCATIONS].filter(
      (loc) => !loc.isServiceManaged
    );
    const references = monitorPrivateLocations.map((loc) => ({
      id: `${monitorSavedObjectId}-${loc.id}`,
      name: `${monitorSavedObjectId}-${loc.id}`,
      type: packagePolicySoType,
    }));
    return {
      id: monitorSavedObjectId,
      monitor: {
        ...monitorWithNamespace,
      } as MonitorFields,
      ...(references.length > 0 && { references }),
    };
  });

  try {
    const createdMonitors = await monitorConfigRepository.createBulk({
      monitors: monitorsToCreate,
      savedObjectType: query.savedObjectType,
    });
    const createdMonitorIds = new Set(
      createdMonitors
        .filter((monitor) => !isSavedObjectErrorResult(monitor))
        .map((monitor) => monitor.id)
    );
    const monitorsToSync = monitorsToCreate.filter(({ id }) => createdMonitorIds.has(id));
    const [policiesResult, syncErrors] =
      monitorsToSync.length > 0
        ? await syntheticsMonitorClient.addMonitors(
            monitorsToSync,
            privateLocations,
            spaceId,
            maintenanceWindows
          )
        : [{ created: [], failed: [] }, []];

    let failedMonitors: FailedMonitorConfig[] = [];

    const { failed: failedPolicies } = policiesResult ?? {};

    newMonitors = createdMonitors;

    const nonConflictFailedPolicies = failedPolicies?.filter(
      ({ error }) => !isPackagePolicyConflictFailure(error)
    );
    if (nonConflictFailedPolicies && nonConflictFailedPolicies.length > 0 && newMonitors) {
      failedMonitors = await handlePrivateConfigErrors(
        routeContext,
        newMonitors,
        nonConflictFailedPolicies
      );
    }

    sendNewMonitorTelemetry(
      server,
      newMonitors,
      syncErrors,
      new Set(failedMonitors.map(({ monitor }) => monitor.id))
    );

    return { errors: syncErrors, newMonitors, failedMonitors };
  } catch (e) {
    await rollBackNewMonitorBulk(monitorsToCreate, routeContext);
    throw e;
  }
};

interface FailedMonitorConfig {
  monitor: MonitorSavedObject;
  error?: Error | SavedObjectError;
}

const handlePrivateConfigErrors = async (
  routeContext: RouteContext,
  createdMonitors: CreatedMonitors,
  failedPolicies: Array<{ packagePolicy: NewPackagePolicy; error?: Error | SavedObjectError }>
) => {
  const failedMonitors: FailedMonitorConfig[] = [];
  const failedMonitorIds = new Set<string>();

  await pMap(failedPolicies, async ({ packagePolicy, error }) => {
    const { inputs } = packagePolicy;
    const enabledInput = inputs?.find((input) => input.enabled);
    const stream = enabledInput?.streams?.[0];
    const vars = stream?.vars;
    const monitorId = vars?.[ConfigKey.CONFIG_ID]?.value;
    const monitor = createdMonitors.find(
      (savedObject): savedObject is MonitorSavedObject =>
        !isSavedObjectErrorResult(savedObject) &&
        savedObject.attributes[ConfigKey.CONFIG_ID] === monitorId
    );
    if (monitor && !failedMonitorIds.has(monitor.id)) {
      failedMonitorIds.add(monitor.id);
      failedMonitors.push({ monitor, error });
      await deleteMonitorIfCreated({
        routeContext,
        newMonitorId: monitor.id,
      });
    }
  });
  return failedMonitors;
};

const rollBackNewMonitorBulk = async (
  monitorsToCreate: Array<{ id: string; monitor: MonitorFields }>,
  routeContext: RouteContext
) => {
  const { server } = routeContext;
  try {
    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);
    await deleteMonitorAPI.execute({
      monitorIds: monitorsToCreate.map(({ id }) => id),
    });
  } catch (error) {
    // ignore errors here
    server.logger.error(`Unable to rollback new monitors, Error: ${error.message}`, { error });
  }
};

const sendNewMonitorTelemetry = (
  server: SyntheticsServerSetup,
  monitors: CreatedMonitors,
  errors?: ServiceLocationErrors | null,
  failedMonitorIds: Set<string> = new Set()
) => {
  for (const monitor of monitors) {
    if (isSavedObjectErrorResult(monitor) || failedMonitorIds.has(monitor.id)) {
      continue;
    }
    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryEvent({
        errors,
        monitor,
        isInlineScript: Boolean((monitor.attributes as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        stackVersion: server.stackVersion,
      })
    );
  }
};

export const deleteMonitorIfCreated = async ({
  newMonitorId,
  routeContext,
}: {
  routeContext: RouteContext;
  newMonitorId: string;
}) => {
  const { server, monitorConfigRepository } = routeContext;
  try {
    const encryptedMonitor = await monitorConfigRepository.get(newMonitorId);
    if (encryptedMonitor) {
      const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);

      await deleteMonitorAPI.deleteMonitorBulk({
        monitors: [encryptedMonitor],
      });
    }
  } catch (e) {
    // ignore errors here
    server.logger.error(`Unable to delete monitor with id ${newMonitorId}`, { error: e });
  }
};
