/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { API_VERSIONS } from '../../../../common/constants';
import { POST_SIEM_READINESS_TASK_API_PATH } from "../../../../common/api/siem_readiness/constants"
import { schema } from '@kbn/config-schema';
import { SiemReadinessRoutesDeps } from "../types"

const SIEM_READINESS_INDEX = 'security_solution-siem_readiness';

export const postReadinessTaskRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger'],
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
            body: schema.object({task_id: schema.string(), status: schema.string(), meta: schema.object({})}),
          },
        },
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          // Write request body to the siem readiness index
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const indexDocument = {
            ...request.body,
            '@timestamp': new Date().toISOString(),
            event: {
              action: 'siem_readiness_task_created',
              category: ['configuration'],
              type: ['creation'],
            },
          };

          await esClient.index({
            id: request.body.task_id,
            index: SIEM_READINESS_INDEX,
            body: indexDocument,
          });

          logger.info(`Indexed SIEM readiness task (${request.body.task_id}) to ${SIEM_READINESS_INDEX}`);

          return response.ok({ body: request.body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error logging SIEM readiness task (${request.body.task_id}): ${error.message}`);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};