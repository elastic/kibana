/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindMaintenanceWindowsResult } from '@kbn/maintenance-windows-plugin/common';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { SyntheticsRestApiRouteFactory } from '../types';

/**
 * The subset of maintenance window fields the Synthetics UI actually consumes: the id/title
 * for the overview callout and the add/edit picker, the status to know which windows are
 * currently running, and updatedAt to detect changes pending a private-location sync.
 */
export type SyntheticsMaintenanceWindow = Pick<
  FindMaintenanceWindowsResult['data'][number],
  'id' | 'title' | 'status' | 'updatedAt'
>;

export interface SyntheticsMaintenanceWindowsResult {
  maintenanceWindows: SyntheticsMaintenanceWindow[];
}

/**
 * Returns the maintenance windows for the current space.
 *
 * Synthetics needs this data on the monitors overview (to surface the "active maintenance
 * windows" callout and per-monitor state) and in the monitor add/edit form. The alerting
 * maintenance-window endpoints require the `read-maintenance-window` privilege, which the
 * Synthetics read-only role does not grant, so calling them directly resulted in a 403 and
 * an error toast for those users. Here we fetch with the internal maintenance-window client
 * (authorization extension excluded) so the data is available regardless of the caller's
 * maintenance-window privileges, while still scoping the result to the caller's space.
 */
export const getMaintenanceWindowsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsMaintenanceWindowsResult
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MAINTENANCE_WINDOWS,
  validate: {},
  handler: async ({ server, request, spaceId }): Promise<SyntheticsMaintenanceWindowsResult> => {
    const maintenanceWindowClient = server.getMaintenanceWindowClientInternal(request);

    if (!maintenanceWindowClient) {
      return { maintenanceWindows: [] };
    }

    const { data } = await maintenanceWindowClient.find({
      page: 1,
      perPage: 1000,
      namespaces: [spaceId],
    });

    return {
      maintenanceWindows: data.map(({ id, title, status, updatedAt }) => ({
        id,
        title,
        status,
        updatedAt,
      })),
    };
  },
});
