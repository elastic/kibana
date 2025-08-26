/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { InstallPrivilegedAccessDetectionPackageResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/privileged_access_detection/install.gen';
import {
  API_VERSIONS,
  APP_ID,
  ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
} from '../../../../../../common/constants';

import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { assertAdvancedSettingsEnabled } from '../../../utils/assert_advanced_setting_enabled';

export const padInstallRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_analytics/privileged_user_monitoring/pad/install',
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
      ): Promise<IKibanaResponse<InstallPrivilegedAccessDetectionPackageResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        await assertAdvancedSettingsEnabled(
          await context.core,
          ENABLE_PRIVILEGED_USER_MONITORING_SETTING
        );

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
      }
    );
};
