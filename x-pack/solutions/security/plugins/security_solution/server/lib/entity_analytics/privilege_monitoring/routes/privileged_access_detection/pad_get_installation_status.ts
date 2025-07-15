/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { GetPrivilegedAccessDetectionPackageStatusResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/privileged_access_detection/status.gen';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';

import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const padGetStatusRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/privileged_user_monitoring/pad/status',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetPrivilegedAccessDetectionPackageStatusResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        try {
          const clientResponse = await secSol.getPadPackageInstallationClient().getStatus();
          return response.ok({
            body: {
              ...clientResponse,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error with PAD installation: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
