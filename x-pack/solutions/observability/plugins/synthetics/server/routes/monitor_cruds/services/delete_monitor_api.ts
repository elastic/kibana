/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { SavedObject, SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { syntheticsMonitorSavedObjectType } from '../../../../common/types/saved_objects';
import { validatePermissions } from '../edit_monitor';
import { assertCanPerformMonitorBulkActionInAllSpaces } from '../monitor_locations_utils';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  SyntheticsMonitor,
  SyntheticsMonitorWithId,
} from '../../../../common/runtime_types';
import {
  formatTelemetryDeleteEvent,
  sendErrorTelemetryEvents,
  sendTelemetryEvents,
} from '../../telemetry/monitor_upgrade_sender';
import { RouteContext } from '../../types';

type MonitorSavedObject = SavedObject<SyntheticsMonitor | EncryptedSyntheticsMonitorAttributes>;

export class DeleteMonitorAPI {
  routeContext: RouteContext;
  result: Array<{ id: string; deleted: boolean; error?: string }> = [];
  constructor(routeContext: RouteContext) {
    this.routeContext = routeContext;
  }

  async getMonitorsToDelete(monitorIds: string[]) {
    const result: MonitorSavedObject[] = [];
    await pMap(
      monitorIds,
      async (monitorId) => {
        const monitor = await this.getMonitorToDelete(monitorId);
        if (monitor) {
          result.push(monitor);
        }
      },
      {
        stopOnError: false,
      }
    );
    return result;
  }

  async getMonitorToDelete(monitorId: string) {
    const { spaceId, savedObjectsClient, server, monitorConfigRepository } = this.routeContext;
    try {
      const { normalizedMonitor } = await monitorConfigRepository.getDecrypted(monitorId, spaceId);

      return normalizedMonitor;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.result.push({
          id: monitorId,
          deleted: false,
          error: `Monitor id ${monitorId} not found!`,
        });
      } else {
        server.logger.error(`Failed to decrypt monitor to delete, monitor id: ${monitorId}`, {
          error: e,
        });
        sendErrorTelemetryEvents(server.logger, server.telemetry, {
          reason: `Failed to decrypt monitor to delete ${monitorId}`,
          message: e?.message,
          type: 'deletionError',
          code: e?.code,
          status: e.status,
          stackVersion: server.stackVersion,
        });
        return await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
          syntheticsMonitorSavedObjectType,
          monitorId
        );
      }
    }
  }

  async execute({ monitorIds }: { monitorIds: string[] }) {
    const monitors = await this.getMonitorsToDelete(monitorIds);

    return this.executeWithMonitors({ monitors });
  }

  async executeWithMonitors({ monitors }: { monitors: MonitorSavedObject[] }) {
    const { response, server } = this.routeContext;

    // Dedup the per-space privilege check across monitors that share the same
    // saved-object type and space set, so a bulk delete issues one privilege
    // round-trip per distinct (type, spaces) combination instead of one per monitor.
    const checkedSpaceKeys = new Set<string>();
    for (const monitor of monitors) {
      const err = await validatePermissions(this.routeContext, monitor.attributes.locations);
      if (err) {
        return {
          res: response.forbidden({
            body: {
              message: err,
            },
          }),
        };
      }

      // Use the saved object's authoritative `namespaces` rather than the
      // denormalized `spaces` attribute, which can drift (e.g. when a monitor
      // is shared via the generic saved-objects share API).
      const monitorSpaces = monitor.namespaces ?? [];
      const spaceKey = `${monitor.type}::${[...new Set(monitorSpaces)].sort().join(',')}`;
      if (!checkedSpaceKeys.has(spaceKey)) {
        checkedSpaceKeys.add(spaceKey);
        const spaceAuthError = await assertCanPerformMonitorBulkActionInAllSpaces(
          this.routeContext,
          monitorSpaces,
          monitor.type,
          'bulk_delete'
        );
        if (spaceAuthError) {
          return { res: spaceAuthError };
        }
      }
    }

    try {
      const { errors, result } = await this.deleteMonitorBulk({
        monitors,
      });

      result.statuses?.forEach((res) => {
        this.result.push({
          id: res.id,
          deleted: res.success,
        });
      });

      return { errors, result: this.result };
    } catch (error) {
      server.logger.error(`Unable to delete Synthetics monitor with error ${error.message}`, {
        error,
      });
      throw error;
    }
  }

  async deleteMonitorBulk({ monitors }: { monitors: MonitorSavedObject[] }) {
    const { server, spaceId, syntheticsMonitorClient } = this.routeContext;
    const { logger, telemetry, stackVersion } = server;

    try {
      const deleteSyncPromise = syntheticsMonitorClient.deleteMonitors(
        monitors.map((normalizedMonitor) => ({
          ...normalizedMonitor.attributes,
          id: normalizedMonitor.attributes[ConfigKey.MONITOR_QUERY_ID],
        })) as SyntheticsMonitorWithId[],
        spaceId
      );

      const deletePromise = this.routeContext.monitorConfigRepository.bulkDelete(
        monitors.map((monitor) => ({ id: monitor.id, type: monitor.type }))
      );

      const [errors, result] = await Promise.all([deleteSyncPromise, deletePromise]);

      monitors.forEach((monitor) => {
        sendTelemetryEvents(
          logger,
          telemetry,
          formatTelemetryDeleteEvent(
            monitor,
            stackVersion,
            new Date().toISOString(),
            Boolean((monitor.attributes as MonitorFields)[ConfigKey.SOURCE_INLINE]),
            errors
          )
        );
      });

      return { errors, result };
    } catch (e) {
      throw e;
    }
  }
}
