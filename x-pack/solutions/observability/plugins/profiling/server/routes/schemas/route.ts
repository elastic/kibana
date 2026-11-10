/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import type { ProfilingSchemasAvailability } from '@kbn/profiling-utils';
import type { RouteRegisterParameters } from '..';
import { getRoutePaths, MAX_KUERY_LENGTH } from '../../../common';
import { PROFILING_API_PRIVILEGE } from '../../feature';
import { handleRouteHandlerError } from '../../utils/handle_route_error_handler';
import { getClient } from '../compat';
import { createCommonFilter } from '../query';

export function registerSchemasRoute({
  router,
  logger,
  dependencies: {
    start: { profilingDataAccess },
  },
}: RouteRegisterParameters) {
  router.get(
    {
      path: getRoutePaths().Schemas,
      security: {
        authz: {
          requiredPrivileges: [PROFILING_API_PRIVILEGE],
        },
      },
      validate: {
        query: schema.object({
          timeFrom: schema.number(),
          timeTo: schema.number(),
          kuery: schema.string({ maxLength: MAX_KUERY_LENGTH }),
        }),
      },
    },
    async (context, request, response) => {
      const { timeFrom, timeTo, kuery } = request.query;

      try {
        const esClient = await getClient(context);

        const body: ProfilingSchemasAvailability =
          await profilingDataAccess.services.getAvailableSchemas({
            esClient,
            abortSignal: getRequestAbortedSignal(request.events.aborted$),
            query: createCommonFilter({
              kuery,
              timeFrom: timeFrom / 1000,
              timeTo: timeTo / 1000,
            }),
          });

        return response.ok({ body });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching the available profiling schemas',
        });
      }
    }
  );
}
