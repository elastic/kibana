/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  GetWatchRequestParams,
  INTERNAL_API_ACCESS,
  PND_WATCH_URL_TEMPLATE,
} from '@kbn/pnd-common';
import type { GetWatchResponse } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { getMockWatchById } from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { getWatchHistoryExtendedPrivileges, getWatchRoutePrivileges } from './watch_route_security';

export const registerGetWatchRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWatchProjection,
}: RouteDependencies) => {
  const extendedPrivileges = getWatchHistoryExtendedPrivileges(config.ui.useMockData);
  router.versioned
    .get({
      path: PND_WATCH_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: getWatchRoutePrivileges(config.ui.useMockData),
          ...(extendedPrivileges.length > 0 ? { extendedPrivileges } : {}),
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

          if (config.ui.useMockData) {
            const watch = getMockWatchById(watchId);
            if (!watch) {
              return response.notFound({
                body: { message: `Watch "${watchId}" not found` },
              });
            }
            const body: GetWatchResponse = { watch };
            return response.ok({ body });
          }

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
