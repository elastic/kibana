/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_WATCHES_SETUP_URL } from '@kbn/pnd-common';
import type { SetupWatchesResponse } from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { getWatchSetupPrivileges } from './watch_route_security';

export const registerSetupWatchesRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWatchProjection,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PND_WATCHES_SETUP_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: getWatchSetupPrivileges(config.ui.useMockData),
        },
      },
      summary: 'Create PND watch starting points',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: {} },
      },
      async (_context, request, response) => {
        try {
          if (config.ui.useMockData) {
            const body: SetupWatchesResponse = { created: [], existing: [], failed: [] };
            return response.ok({ body });
          }

          const projection = getWatchProjection?.();
          if (!projection) {
            return response.customError({
              statusCode: 503,
              body: { message: 'Watch projection is not available' },
            });
          }

          const body: SetupWatchesResponse = await projection.setup(request, getSpaceId(request));
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to set up watches: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to set up watches' },
          });
        }
      }
    );
};
