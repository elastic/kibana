/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_WATCHES_URL } from '@kbn/pnd-common';
import type { ListWatchesResponse } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

export const registerListWatchesRoute = ({
  router,
  logger,
  getSpaceId,
  getWatchesService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_WATCHES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PND_API_PRIVILEGE_READ],
        },
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
          const body: ListWatchesResponse = await getWatchesService().list(getSpaceId(request));
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list watches: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list watches' },
          });
        }
      }
    );
};
