/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_WATCH_SCHEDULE_URL_TEMPLATE,
} from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { getWatchUpdateRouteAuthz } from './watch_route_security';

const EnsureWatchScheduleRequestParams = z.object({
  watchId: z.string().min(1).max(128),
});

/**
 * Activates a watch's `scheduled` trigger in the caller's space. Managed static install writes the
 * workflow document but does not program Task Manager, so a scheduled watch does not run until an
 * enablement update reaches the Workflows API — this route makes that call for the current space.
 */
export const registerEnsureWatchScheduleRoute = ({
  router,
  logger,
  getSpaceId,
  getWatchesService,
  config,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PND_WATCH_SCHEDULE_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getWatchUpdateRouteAuthz(config.ui.useMockData),
      },
      summary: "Register the Task Manager schedule for a watch's scheduled trigger in this space",
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(EnsureWatchScheduleRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { watchId } = request.params;
          const result = await getWatchesService().ensureSchedule(
            watchId,
            getSpaceId(request),
            request
          );

          switch (result.outcome) {
            case 'scheduled':
              return response.ok({ body: { scheduled: true } });
            case 'not-found':
              return response.notFound({
                body: { message: `Watch "${watchId}" not found` },
              });
            case 'unavailable':
              return response.customError({
                statusCode: 503,
                body: { message: 'Workflows management API is not available' },
              });
          }
        } catch (error) {
          logger.error(`Failed to ensure watch schedule: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to ensure watch schedule' },
          });
        }
      }
    );
};
