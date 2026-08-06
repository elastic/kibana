/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_WATCH_URL_TEMPLATE } from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { getWatchWritePrivileges } from './watch_route_security';

/**
 * POC: PATCH watch settings onto the user-owned workflow document.
 * Writable: enabled, description, autonomyLevel (1–5), scheduleInterval.
 */
export const registerUpdateWatchRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWatchProjection,
}: RouteDependencies) => {
  router.versioned
    .patch({
      path: PND_WATCH_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: getWatchWritePrivileges(config.ui.useMockData),
        },
      },
      summary: 'POC: update PND watch settings',
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
              enabled: schema.maybe(schema.boolean()),
              description: schema.maybe(schema.string({ maxLength: 4000 })),
              autonomyLevel: schema.maybe(schema.number({ min: 1, max: 5 })),
              scheduleInterval: schema.maybe(
                schema.string({
                  minLength: 2,
                  maxLength: 16,
                  validate: (v) =>
                    /^\d+(m|h|d)$/.test(v) ? undefined : 'must look like 15m, 1h, or 1d',
                })
              ),
            }),
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
          const body = await projection.updateSettings(
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
          logger.error(`Failed to update watch: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update watch' },
          });
        }
      }
    );
};
