/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_WATCH_URL_TEMPLATE } from '@kbn/pnd-common';
import type { GetWatchResponse } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { RouteDependencies } from '../register_routes';
import { getWatchRoutePrivileges } from './watch_route_security';

const GetWatchRequestParams = z.object({
  watchId: z.string().min(1).max(128),
});

export const registerGetWatchRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWatchProjection,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_WATCH_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: getWatchRoutePrivileges(config.ui.useMockData),
        },
      },
      summary: 'Get a PND watch by id',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetWatchRequestParams),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { watchId } = request.params;
          const projection = getWatchProjection?.();
          if (!projection) {
            return response.notFound({
              body: { message: `Watch "${watchId}" not found` },
            });
          }

          const result = await projection.get(watchId, getSpaceId(request), request);
          if (!result) {
            return response.notFound({
              body: { message: `Watch "${watchId}" not found` },
            });
          }

          const body: GetWatchResponse = result;
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to get watch: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get watch' },
          });
        }
      }
    );
};
