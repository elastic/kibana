/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { InstallPrivilegedAccessDetectionPackageResponse } from '../../../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID, PAD_INSTALL_URL } from '../../../../../../common/constants';

import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

export const padInstallRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: PAD_INSTALL_URL,
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
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<InstallPrivilegedAccessDetectionPackageResponse>> => {
          const siemResponse = buildSiemResponse(response);
          const secSol = await context.securitySolution;

          try {
            const clientResponse = await secSol
              .getPadPackageInstallationClient()
              .installPrivilegedAccessDetectionPackage();
            return response.ok({
              body: {
                ...clientResponse,
              },
            });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error PAD installation: ${error.message}`);
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
