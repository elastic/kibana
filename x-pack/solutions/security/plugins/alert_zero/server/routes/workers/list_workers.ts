/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERT_ZERO_WORKERS_URL,
  type ListWorkersResponse,
} from '@kbn/alert-zero-common';
import { ALERT_ZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

export const registerListWorkersRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkersService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERT_ZERO_WORKERS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERT_ZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'List Alert Zero workers',
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
          const body: ListWorkersResponse = await getWorkersService().list(
            request,
            getSpaceId(request)
          );
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list workers: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list workers' },
          });
        }
      }
    );
};
