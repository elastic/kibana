/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  MonitorFields,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import { validatePermissions } from '../edit_monitor';
import type { RouteContext } from '../../types';

export interface ResetResult {
  id: string;
  reset: boolean;
  error?: string;
}

interface DecryptedMonitorPair {
  decryptedMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
  normalizedMonitor: SavedObject<SyntheticsMonitor>;
}

export class ResetMonitorAPI {
  routeContext: RouteContext;
  force: boolean;
  result: ResetResult[] = [];

  constructor(routeContext: RouteContext, force = false) {
    this.routeContext = routeContext;
    this.force = force;
  }

  async getMonitorsToReset(monitorIds: string[]): Promise<DecryptedMonitorPair[]> {
    const monitors: DecryptedMonitorPair[] = [];
    await pMap(
      monitorIds,
      async (monitorId) => {
        const pair = await this.getMonitor(monitorId);
        if (pair) {
          monitors.push(pair);
        }
      },
      { stopOnError: false }
    );
    return monitors;
  }

  private async getMonitor(monitorId: string): Promise<DecryptedMonitorPair | undefined> {
    const { spaceId, server, monitorConfigRepository } = this.routeContext;
    try {
      return await monitorConfigRepository.getDecrypted(monitorId, spaceId);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.result.push({
          id: monitorId,
          reset: false,
          error: `Monitor id ${monitorId} not found!`,
        });
      } else {
        server.logger.error(`Failed to decrypt monitor to reset, monitor id: ${monitorId}`, {
          error: e,
        });
        this.result.push({ id: monitorId, reset: false, error: e.message });
      }
      return undefined;
    }
  }

  async execute({ monitorIds }: { monitorIds: string[] }) {
    const { server } = this.routeContext;

    const monitors = await this.getMonitorsToReset(monitorIds);

    const authorizedMonitors = await this.filterAuthorized(monitors);
    if (authorizedMonitors.length === 0) {
      return { result: this.result };
    }

    try {
      const errors = await this.resetMonitors(authorizedMonitors);
      return { result: this.result, errors };
    } catch (error) {
      server.logger.error(`Unable to reset Synthetics monitors: ${error.message}`, { error });
      throw error;
    }
  }

  private async filterAuthorized(
    monitors: DecryptedMonitorPair[]
  ): Promise<DecryptedMonitorPair[]> {
    const authorized: DecryptedMonitorPair[] = [];
    for (const pair of monitors) {
      const attrs = pair.normalizedMonitor.attributes as MonitorFields;
      const err = await validatePermissions(this.routeContext, attrs.locations);
      if (err) {
        this.result.push({ id: pair.normalizedMonitor.id, reset: false, error: err });
      } else {
        authorized.push(pair);
      }
    }
    return authorized;
  }

  private async resetMonitors(monitors: DecryptedMonitorPair[]) {
    const { savedObjectsClient, spaceId } = this.routeContext;
    const allPrivateLocations = await getPrivateLocations(savedObjectsClient);

    if (this.force) {
      return this.forceReset(monitors, allPrivateLocations, spaceId);
    }
    return this.defaultReset(monitors, allPrivateLocations, spaceId);
  }

  private async defaultReset(
    monitors: DecryptedMonitorPair[],
    allPrivateLocations: Awaited<ReturnType<typeof getPrivateLocations>>,
    spaceId: string
  ) {
    const { syntheticsMonitorClient } = this.routeContext;

    const { failedPolicyUpdates, publicSyncErrors } = await syntheticsMonitorClient.editMonitors(
      monitors.map(({ normalizedMonitor, decryptedMonitor }) => ({
        monitor: normalizedMonitor.attributes as MonitorFields,
        id: normalizedMonitor.id,
        decryptedPreviousMonitor: decryptedMonitor,
      })),
      allPrivateLocations,
      spaceId
    );

    const errors = [
      ...(publicSyncErrors ?? []),
      ...(failedPolicyUpdates ?? []).filter((u) => u.error).map((u) => u.error),
    ];

    for (const { normalizedMonitor } of monitors) {
      this.result.push({ id: normalizedMonitor.id, reset: true });
    }

    return errors.length > 0 ? errors : undefined;
  }

  private async forceReset(
    monitors: DecryptedMonitorPair[],
    allPrivateLocations: Awaited<ReturnType<typeof getPrivateLocations>>,
    spaceId: string
  ) {
    const { syntheticsMonitorClient } = this.routeContext;

    const monitorsAsDelete = monitors.map(({ normalizedMonitor }) => {
      const attrs = normalizedMonitor.attributes as MonitorFields;
      return {
        ...attrs,
        id: attrs[ConfigKey.MONITOR_QUERY_ID] || normalizedMonitor.id,
        updated_at: normalizedMonitor.updated_at ?? '',
        created_at: normalizedMonitor.created_at ?? '',
      };
    });

    await syntheticsMonitorClient.deleteMonitors(monitorsAsDelete, spaceId);

    const [, syncErrors] = await syntheticsMonitorClient.addMonitors(
      monitors.map(({ normalizedMonitor }) => ({
        monitor: normalizedMonitor.attributes as MonitorFields,
        id: normalizedMonitor.id,
      })),
      allPrivateLocations,
      spaceId
    );

    for (const { normalizedMonitor } of monitors) {
      this.result.push({ id: normalizedMonitor.id, reset: true });
    }

    return syncErrors && syncErrors.length > 0 ? syncErrors : undefined;
  }
}
