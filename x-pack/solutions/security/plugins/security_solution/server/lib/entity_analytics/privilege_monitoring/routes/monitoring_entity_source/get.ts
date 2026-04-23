/* eslint-disable @kbn/eslint/require-license-header */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import {
  API_VERSIONS,
  APP_ID,
  MONITORING_ENTITY_SOURCE_URL,
} from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import {
  type GetEntitySourceResponse,
  GetEntitySourceRequestParams,
} from '../../../../../../common/api/entity_analytics';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

export const getMonitoringEntitySourceRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .get({
      access: 'public',
      path: `${MONITORING_ENTITY_SOURCE_URL}/{id}`,
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
            params: GetEntitySourceRequestParams,
          },
        },
      },
      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<GetEntitySourceResponse>> => {
          const siemResponse = buildSiemResponse(response);

          try {
            const secSol = await context.securitySolution;
            const client = secSol.getMonitoringEntitySourceDataClient();
            const body = await client.get(request.params.id);
            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error getting monitoring entity source sync config: ${error.message}`);
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
