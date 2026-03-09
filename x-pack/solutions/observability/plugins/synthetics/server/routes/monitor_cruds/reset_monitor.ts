/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { MonitorFields } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getPrivateLocations } from '../../synthetics_service/get_private_locations';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import { validatePermissions } from './edit_monitor';

export const resetSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_RESET,
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
    query: schema.object({
      force: schema.boolean({ defaultValue: false }),
    }),
  },
  handler: async (routeContext): Promise<any> => {
    const {
      request,
      response,
      spaceId,
      server,
      savedObjectsClient,
      syntheticsMonitorClient,
      monitorConfigRepository,
    } = routeContext;
    const { monitorId } = request.params;
    const { force } = request.query;

    try {
      const { decryptedMonitor, normalizedMonitor } = await monitorConfigRepository.getDecrypted(
        monitorId,
        spaceId
      );
      const monitorAttributes = normalizedMonitor.attributes as MonitorFields;

      const permissionErr = await validatePermissions(routeContext, monitorAttributes.locations);
      if (permissionErr) {
        return response.forbidden({ body: { message: permissionErr } });
      }

      const allPrivateLocations = await getPrivateLocations(savedObjectsClient);

      if (force) {
        const monitorAsDelete = {
          ...monitorAttributes,
          id: monitorAttributes[ConfigKey.MONITOR_QUERY_ID] || normalizedMonitor.id,
          updated_at: normalizedMonitor.updated_at ?? '',
          created_at: normalizedMonitor.created_at ?? '',
        };

        await syntheticsMonitorClient.deleteMonitors([monitorAsDelete], spaceId);

        const [, syncErrors] = await syntheticsMonitorClient.addMonitors(
          [{ monitor: monitorAttributes, id: normalizedMonitor.id }],
          allPrivateLocations,
          spaceId
        );

        if (syncErrors && syncErrors.length > 0) {
          return response.ok({
            body: {
              message: 'error pushing monitor to the service',
              attributes: { errors: syncErrors },
            },
          });
        }
      } else {
        const { failedPolicyUpdates, publicSyncErrors } =
          await syntheticsMonitorClient.editMonitors(
            [
              {
                monitor: monitorAttributes,
                id: normalizedMonitor.id,
                decryptedPreviousMonitor: decryptedMonitor,
              },
            ],
            allPrivateLocations,
            spaceId
          );

        const errors = [
          ...(publicSyncErrors ?? []),
          ...(failedPolicyUpdates ?? []).filter((u) => u.error).map((u) => u.error),
        ];

        if (errors.length > 0) {
          return response.ok({
            body: {
              message: 'error pushing monitor to the service',
              attributes: { errors },
            },
          });
        }
      }

      return { id: normalizedMonitor.id, reset: true };
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      server.logger.error(`Unable to reset Synthetics monitor ${monitorId}: ${error.message}`, {
        error,
      });

      return response.customError({
        body: { message: error.message },
        statusCode: 500,
      });
    }
  },
});
