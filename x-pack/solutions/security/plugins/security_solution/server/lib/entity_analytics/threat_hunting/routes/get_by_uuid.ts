/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import type { ThreatHuntingGetByUuidResponse } from '../../../../../common/api/entity_analytics/threat_hunting/get_by_uuid.gen';
import { ThreatHuntingGetByUuidRequestParams } from '../../../../../common/api/entity_analytics/threat_hunting/get_by_uuid.gen';
import { THREAT_HUNTING_PUBLIC_URL } from '../../../../../common/entity_analytics/threat_hunting/constants';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const getThreatHuntingQueryByUuidRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: `${THREAT_HUNTING_PUBLIC_URL}/queries/{uuid}`,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ThreatHuntingGetByUuidRequestParams),
          },
        },
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ThreatHuntingGetByUuidResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const { uuid } = request.params;

        try {
          const secSol = await context.securitySolution;
          const maybeQuery = await secSol.getThreatHuntingQueriesDataClient().getByUuid({
            uuid,
          });

          if (!maybeQuery) {
            return siemResponse.error({
              statusCode: 404,
              body: `Query with uuid ${uuid} not found`,
            });
          }

          return response.ok({
            body: {
              query: maybeQuery,
            },
          });
        } catch (e) {
          logger.error(`Error in list threat hunting queries: ${JSON.stringify(e)}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
