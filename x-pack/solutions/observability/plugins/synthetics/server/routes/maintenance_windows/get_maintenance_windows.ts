/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindMaintenanceWindowsResult } from '@kbn/alerting-plugin/server/application/maintenance_window/methods/find/types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { ConfigKey } from '../../../common/constants/monitor_management';
import type { SyntheticsRestApiRouteFactory } from '../types';

/**
 * The subset of maintenance window fields the Synthetics UI actually consumes: the id/title
 * for the overview callout, the status to know which windows are currently running, and
 * updatedAt to detect changes pending a private-location sync.
 */
export type SyntheticsMaintenanceWindow = Pick<
  FindMaintenanceWindowsResult['data'][number],
  'id' | 'title' | 'status' | 'updatedAt'
>;

export interface SyntheticsMaintenanceWindowsResult {
  maintenanceWindows: SyntheticsMaintenanceWindow[];
}

/**
 * Returns the maintenance windows referenced by the current space's monitors.
 *
 * The monitors overview needs this to surface the "active maintenance windows" callout and
 * per-monitor state. The alerting maintenance-window endpoints require the
 * `read-maintenance-window` privilege, which the Synthetics read-only role does not grant,
 * so calling them directly returned a 403 and an error toast for those users.
 *
 * We resolve the windows with the internal maintenance-window client (authorization
 * extension excluded) via `syntheticsService.getMaintenanceWindows` so the data is available
 * regardless of the caller's maintenance-window privileges. To keep that elevated read as
 * narrow as possible we return only the windows that are actually referenced by a monitor in
 * the caller's space — a read-only user cannot use this route to enumerate every maintenance
 * window in the space. The add/edit form, which needs the full list to assign new windows,
 * keeps using the privileged alerting endpoint.
 */
export const getMaintenanceWindowsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsMaintenanceWindowsResult
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MAINTENANCE_WINDOWS,
  validate: {},
  handler: async ({
    syntheticsMonitorClient,
    spaceId,
    monitorConfigRepository,
  }): Promise<SyntheticsMaintenanceWindowsResult> => {
    // Collect the maintenance window ids referenced by monitors in this space so we only
    // expose those windows, not every window the space happens to contain.
    const monitors = await monitorConfigRepository.getAll({
      fields: [ConfigKey.MAINTENANCE_WINDOWS],
    });
    const referencedIds = new Set<string>();
    for (const monitor of monitors) {
      for (const id of monitor.attributes[ConfigKey.MAINTENANCE_WINDOWS] ?? []) {
        referencedIds.add(id);
      }
    }

    if (referencedIds.size === 0) {
      return { maintenanceWindows: [] };
    }

    const maintenanceWindows = await syntheticsMonitorClient.syntheticsService.getMaintenanceWindows(
      spaceId
    );

    return {
      maintenanceWindows: maintenanceWindows
        .filter((mw) => referencedIds.has(mw.id))
        .map(({ id, title, status, updatedAt }) => ({ id, title, status, updatedAt })),
    };
  },
});
