/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_WATCHES_URL,
} from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { getWatchWritePrivileges } from './watch_route_security';

/**
 * POC: take a shipped catalogue update for a pre-built watch.
 * Re-applies customer settings; conflicts when the definition body was edited.
 */
export const registerApplyWatchUpdateRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWatchProjection,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: `${PND_WATCHES_URL}/{watchId}/apply_update`,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: getWatchWritePrivileges(config.ui.useMockData),
        },
      },
      summary: 'POC: apply shipped catalogue update to a pre-built watch',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              watchId: schema.string({ minLength: 1, maxLength: 128 }),
            }),
            body: schema.object({
              force: schema.maybe(schema.boolean()),
            }),
          },
        },
      },
      async (_context, request, response) => {
        try {
          if (config.ui.useMockData) {
            return response.customError({
              statusCode: 501,
              body: { message: 'Catalogue updates require useMockData: false' },
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
          const { result, watch } = await projection.applyUpdate(
            request,
            watchId,
            getSpaceId(request),
            request.body.force
          );

          if (result.conflict && !result.updated) {
            return response.customError({
              statusCode: 409,
              body: {
                message: result.conflictReason ?? 'Definition conflict',
                attributes: result,
              },
            });
          }

          return response.ok({
            body: {
              ...result,
              watch,
            },
          });
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
          if (statusCode === 400) {
            return response.badRequest({
              body: { message: error instanceof Error ? error.message : 'Bad request' },
            });
          }
          logger.error(`Failed to apply watch update: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to apply watch update' },
          });
        }
      }
    );
};
