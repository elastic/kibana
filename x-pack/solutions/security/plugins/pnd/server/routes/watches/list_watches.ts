/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_WATCHES_URL } from '@kbn/pnd-common';
import type { ListWatchesResponse } from '@kbn/pnd-common';
import type { RouteDependencies } from '../register_routes';
import { httpStatusFromWatchError } from '../../services/watches/workflows_read_authz';
import { getWatchRouteAuthz } from './watch_route_security';

export const registerListWatchesRoute = ({
  config,
  getSpaceId,
  getWatchesService,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_WATCHES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getWatchRouteAuthz(config.ui.useMockData),
      },
      summary: 'List PND watches',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      async (_context, request, response) => {
        try {
          const body: ListWatchesResponse = await getWatchesService().list(
            getSpaceId(request),
            request
          );
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list watches: ${error}`);
          return response.customError({
            statusCode: httpStatusFromWatchError(error),
            body: { message: 'Failed to list watches' },
          });
        }
      }
    );
};
