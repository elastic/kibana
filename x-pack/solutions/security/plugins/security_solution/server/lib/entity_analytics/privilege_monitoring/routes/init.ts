/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { InitMonitoringEngineResponse } from '../../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID, MONITORING_ENGINE_INIT_URL } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createInitialisationService } from '../engine/initialisation_service';
import { PrivilegeMonitoringApiKeyType } from '../auth/saved_object';
import { monitoringEntitySourceType } from '../saved_objects';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../constants';
import { withMinimumLicense } from '../../utils/with_minimum_license';

export const initPrivilegeMonitoringEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: MONITORING_ENGINE_INIT_URL,
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
        ): Promise<IKibanaResponse<InitMonitoringEngineResponse>> => {
          const siemResponse = buildSiemResponse(response);
          const secSol = await context.securitySolution;

          const dataClient = secSol.getPrivilegeMonitoringDataClient();
          const soClient = dataClient.getScopedSoClient(request, {
            includedHiddenTypes: [
              PrivilegeMonitoringApiKeyType.name,
              monitoringEntitySourceType.name,
            ],
          });
          const service = createInitialisationService(dataClient, soClient);

          try {
            const initResult = await service.init();

            if (initResult.status === PRIVILEGE_MONITORING_ENGINE_STATUS.ERROR) {
              return siemResponse.error({ statusCode: 500, body: initResult });
            }

            return response.ok({ body: initResult });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error initializing privilege monitoring engine: ${error.message}`);
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
