/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { DisableMonitoringEngineResponse } from '../../../../../common/api/entity_analytics';
import {
  API_VERSIONS,
  APP_ID,
  MONITORING_ENGINE_DISABLE_URL,
} from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createEngineStatusService } from '../engine/status_service';
import { withMinimumLicense } from '../../utils/with_minimum_license';

export const disablePrivilegeMonitoringEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: MONITORING_ENGINE_DISABLE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      options: {
        availability: {
          since: '9.1.0',
          stability: 'stable',
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
        ): Promise<IKibanaResponse<DisableMonitoringEngineResponse>> => {
          const siemResponse = buildSiemResponse(response);
          const secSol = await context.securitySolution;

          try {
            const dataClient = secSol.getPrivilegeMonitoringDataClient();
            const soClient = dataClient.getScopedSoClient(request);
            const statusService = createEngineStatusService(dataClient, soClient);
            const body = await statusService.disable();
            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error disabling privilege monitoring engine: ${error.message}`);
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
