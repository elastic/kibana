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
  UpdateEntitySourceRequestBody,
  type UpdateEntitySourceResponse,
  UpdateEntitySourceRequestParams,
} from '../../../../../../common/api/entity_analytics';
import { createEngineStatusService } from '../../engine/status_service';
import { PrivilegeMonitoringApiKeyType } from '../../auth/saved_object';
import { monitoringEntitySourceType } from '../../saved_objects/monitoring_entity_source_type';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../../constants';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

export const updateMonitoringEntitySourceRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .put({
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
            body: UpdateEntitySourceRequestBody,
            params: UpdateEntitySourceRequestParams,
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<UpdateEntitySourceResponse>> => {
          const siemResponse = buildSiemResponse(response);

          try {
            const secSol = await context.securitySolution;
            const client = secSol.getMonitoringEntitySourceDataClient();
            const body = await client.update({ ...request.body, id: request.params.id });

            const privMonDataClient = secSol.getPrivilegeMonitoringDataClient();
            const soClient = privMonDataClient.getScopedSoClient(request, {
              includedHiddenTypes: [
                PrivilegeMonitoringApiKeyType.name,
                monitoringEntitySourceType.name,
              ],
            });

            const statusService = createEngineStatusService(privMonDataClient, soClient);
            const engineStatus = await statusService.get();

            try {
              if (engineStatus.status === PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED) {
                await statusService.scheduleNow();
              }
            } catch (e) {
              logger.warn(`[Privilege Monitoring] Error scheduling task, received ${e.message}`);
            }

            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error creating monitoring entity source sync config: ${error.message}`);
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
