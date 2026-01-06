/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export interface MaintenanceWindowInfo {
  id: string;
  title: string;
  spaceId?: string;
}

export interface GetMaintenanceWindowsResponse {
  maintenanceWindows: MaintenanceWindowInfo[];
}

export const getMaintenanceWindowsRoute: SyntheticsRestApiRouteFactory<
  GetMaintenanceWindowsResponse
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.MAINTENANCE_WINDOWS,
  validate: {
    body: schema.object({
      monitorId: schema.string(),
    }),
  },
  handler: async ({ request, server, spaceId, monitorConfigRepository }) => {
    const { monitorId } = request.body as { monitorId: string };

    const monitor = await monitorConfigRepository.get(monitorId);
    const monitorNamespaces = monitor.namespaces ?? [];

    const maintenanceWindowClient =
      server.pluginsStart.maintenanceWindows?.getMaintenanceWindowClientWithAuth(request);

    if (!maintenanceWindowClient) {
      return { maintenanceWindows: [] };
    }

    // Only query spaces the monitor is actually shared with (excluding current space)
    const otherSpaces = monitorNamespaces.filter((ns) => ns !== spaceId);

    const otherSpaceMWs: MaintenanceWindowInfo[] = [];
    for (const otherSpace of otherSpaces) {
      const result = await maintenanceWindowClient.find({
        page: 0,
        perPage: 1000,
        namespaces: [otherSpace],
      });
      for (const mw of result.data) {
        otherSpaceMWs.push({ id: mw.id, title: mw.title, spaceId: otherSpace });
      }
    }

    return { maintenanceWindows: otherSpaceMWs };
  },
});
