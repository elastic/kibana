/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildInitRequestBodyValidation } from './validation';
import type { InitEntityStoreResponse } from '../../../../../common/api/entity_analytics/entity_store/enable.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { checkAndInitAssetCriticalityResources } from '../../asset_criticality/check_and_init_asset_criticality_resources';
import { InitEntityStoreRequestBody } from '../../../../../common/api/entity_analytics/entity_store/enable.gen';
import { checkAndInitPrivilegeMonitoringResources } from '../../privilege_monitoring/check_and_init_privmon_resources';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../telemetry/event_based/events';

export const enableEntityStoreRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  telemetry: ITelemetryEventsSender,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/enable',
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
            body: buildInitRequestBodyValidation(InitEntityStoreRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<InitEntityStoreResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;
        const { pipelineDebugMode } = config.entityAnalytics.entityStore.developer;

        await checkAndInitAssetCriticalityResources(context, logger);
        await checkAndInitPrivilegeMonitoringResources(context, logger);

        try {
          const body: InitEntityStoreResponse = await secSol
            .getEntityStoreDataClient()
            .enable(request.body, { pipelineDebugMode });

          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
          });

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initialising entity store: ${error.message}`);
          telemetry.reportEBT(ENTITY_STORE_API_CALL_EVENT, {
            endpoint: request.route.path,
            error: error.message,
          });
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
