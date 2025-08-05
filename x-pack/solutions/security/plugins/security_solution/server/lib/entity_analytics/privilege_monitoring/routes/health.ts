/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { PrivMonHealthResponse } from '../../../../../common/api/entity_analytics/privilege_monitoring/health.gen';
import {
  API_VERSIONS,
  APP_ID,
  ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
} from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';

export const healthCheckPrivilegeMonitoringRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_analytics/monitoring/privileges/health',
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

      async (context, request, response): Promise<IKibanaResponse<PrivMonHealthResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        await assertAdvancedSettingsEnabled(
          await context.core,
          ENABLE_PRIVILEGED_USER_MONITORING_SETTING
        );

        try {
          const body = await secSol.getPrivilegeMonitoringDataClient().getEngineStatus();
          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);

          if (error?.statusCode === 404) {
            return response.ok({
              body: { status: 'not_found' },
            });
          }

          logger.error(`Error checking privilege monitoring health: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
