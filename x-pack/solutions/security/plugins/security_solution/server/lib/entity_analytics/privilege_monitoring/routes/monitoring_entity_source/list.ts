/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  API_VERSIONS,
  APP_ID,
  MONITORING_ENTITY_LIST_SOURCES_URL,
} from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import {
  ListEntitySourcesRequestQuery,
  type ListEntitySourcesResponse,
} from '../../../../../../common/api/entity_analytics';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

export const listMonitoringEntitySourceRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: MONITORING_ENTITY_LIST_SOURCES_URL,
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
            query: buildRouteValidationWithZod(ListEntitySourcesRequestQuery),
          },
        },
      },
      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<ListEntitySourcesResponse>> => {
          const siemResponse = buildSiemResponse(response);

          try {
            const secSol = await context.securitySolution;
            const client = secSol.getMonitoringEntitySourceDataClient();
            const body = await client.list(request.query);

            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error listing monitoring entity sources: ${error.message}`);
            return siemResponse.error({
              statusCode: error.statusCode,
              body: error.message,
            });
          }
        },
        'platinum'
      )
    );
};
