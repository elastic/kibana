/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import { API_VERSIONS } from '../../../../common/constants';
import { POST_SIEM_READINESS_TASK_API_PATH } from '../../../../common/api/siem_readiness/constants';
import type { SiemReadinessRoutesDeps } from '../types';

const SIEM_READINESS_INDEX = 'security_solution-siem_readiness';

export const postReadinessTaskRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .post({
      access: 'public',
      path: POST_SIEM_READINESS_TASK_API_PATH,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: schema.object({
              task_id: schema.string(),
              status: schema.oneOf([schema.literal('completed'), schema.literal('incomplete')]),
              meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
            }),
          },
        },
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const indexDocument = {
            ...request.body,
            '@timestamp': new Date().toISOString(),
          };

          await esClient.index({
            index: SIEM_READINESS_INDEX,
            body: indexDocument,
            refresh: 'true', // Force refresh to make the document searchable immediately
          });

          logger.info(
            `Indexed SIEM readiness task (${request.body.task_id}) to ${SIEM_READINESS_INDEX}`
          );

          return response.ok({ body: request.body });
        } catch (e) {
          const error = transformError(e);
          logger.error(
            `Error logging SIEM readiness task (${request.body.task_id}): ${error.message}`
          );

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
