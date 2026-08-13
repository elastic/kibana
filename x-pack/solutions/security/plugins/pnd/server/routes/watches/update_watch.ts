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
  PND_WATCH_URL_TEMPLATE,
  UpdateWatchRequestBody,
} from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { storeUnavailableResponse } from '../store_route_guard';
import { getWatchWriteRoutePrivileges } from './watch_route_security';

const UpdateWatchRequestParams = z.object({
  watchId: z.string().min(1).max(128),
});

export const registerUpdateWatchRoute = ({
  router,
  logger,
  getSpaceId,
  getWatchesService,
}: RouteDependencies) => {
  router.versioned
    .patch({
      path: PND_WATCH_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: getWatchWriteRoutePrivileges(),
        },
      },
      summary: 'Update a PND watch and its settings',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateWatchRequestParams),
            body: buildRouteValidationWithZod(UpdateWatchRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { watchId } = request.params;
          const result = await getWatchesService().update(
            watchId,
            request.body,
            getSpaceId(request),
            request
          );

          switch (result.outcome) {
            case 'updated':
              return response.ok({ body: result.response });
            case 'not-found':
              return response.notFound({
                body: { message: `Watch "${watchId}" not found` },
              });
            case 'rejected':
              return response.badRequest({
                body: { message: `Cannot apply ${result.what} to watch "${watchId}"` },
              });
            case 'unavailable':
              return storeUnavailableResponse(response);
          }
        } catch (error) {
          logger.error(`Failed to update watch: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update watch' },
          });
        }
      }
    );
};
