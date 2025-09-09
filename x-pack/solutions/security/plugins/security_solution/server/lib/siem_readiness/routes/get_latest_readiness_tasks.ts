/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { API_VERSIONS } from '../../../../common/constants';
import { GET_SIEM_READINESS_TASKS_API_PATH } from '../../../../common/api/siem_readiness/constants';
import type { SiemReadinessRoutesDeps } from '../types';

const SIEM_READINESS_INDEX = 'security_solution-siem_readiness';

export const getLatestReadinessTaskRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .get({
      access: 'public',
      path: GET_SIEM_READINESS_TASKS_API_PATH,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const searchResult = await esClient.search({
            index: SIEM_READINESS_INDEX,
            body: {
              query: { match_all: {} },
              sort: [{ '@timestamp': { order: 'desc' } }],
            },
          });

          logger.info(
            `Retrieved ${searchResult.hits.hits.length} SIEM readiness tasks from ${SIEM_READINESS_INDEX}`
          );

          return response.ok({
            body: {
              hits: searchResult.hits.hits,
              total: searchResult.hits.total,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving SIEM readiness tasks: ${error.message}`);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
