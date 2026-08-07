/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_WATCH_URL_TEMPLATE,
  UpdateWatchRequestBody,
  UpdateWatchRequestParams,
} from '@kbn/pnd-common';
import type { UpdateWatchResponse } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { RouteDependencies } from '../register_routes';
import { getWatchWritePrivileges } from './watch_route_security';

export const registerUpdateWatchRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWatchProjection,
}: RouteDependencies) => {
  router.versioned
    .put({
      path: PND_WATCH_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: getWatchWritePrivileges(config.ui.useMockData),
        },
      },
      summary: 'Update PND watch settings',
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
          if (config.ui.useMockData) {
            return response.customError({
              statusCode: 501,
              body: { message: 'Watch settings writes require useMockData: false' },
            });
          }

          const projection = getWatchProjection?.();
          if (!projection) {
            return response.customError({
              statusCode: 503,
              body: { message: 'Watch projection is not available' },
            });
          }

          const { watchId } = request.params;
          const body: UpdateWatchResponse = await projection.updateSettings(
            request,
            watchId,
            getSpaceId(request),
            request.body
          );
          return response.ok({ body });
        } catch (error) {
          const statusCode =
            typeof error === 'object' && error != null && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : undefined;
          if (statusCode === 404) {
            return response.notFound({
              body: { message: error instanceof Error ? error.message : 'Watch not found' },
            });
          }
          if (statusCode === 403) {
            return response.forbidden({
              body: { message: error instanceof Error ? error.message : 'Forbidden' },
            });
          }
          if (statusCode === 400) {
            return response.badRequest({
              body: { message: error instanceof Error ? error.message : 'Invalid settings' },
            });
          }
          logger.error(`Failed to update watch: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update watch' },
          });
        }
      }
    );
};
