/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { GetEntityStoreStatusResponse } from '../../../../../common/api/entity_analytics/entity_store/status.gen';
import { GetEntityStoreStatusRequestQuery } from '../../../../../common/api/entity_analytics/entity_store/status.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { checkAndInitAssetCriticalityResources } from '../../asset_criticality/check_and_init_asset_criticality_resources';
import { checkAndInitPrivilegeMonitoringResources } from '../../privilege_monitoring/check_and_init_privmon_resources';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { ENTITY_STORE_API_CALL_EVENT } from '../../../telemetry/event_based/events';

export const getEntityStoreStatusRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  telemetry: ITelemetryEventsSender,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_store/status',
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
            query: buildRouteValidationWithZod(GetEntityStoreStatusRequestQuery),
          },
        },
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetEntityStoreStatusResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;

        await checkAndInitAssetCriticalityResources(context, logger);
        await checkAndInitPrivilegeMonitoringResources(context, logger);

        try {
          const body: GetEntityStoreStatusResponse = await secSol
            .getEntityStoreDataClient()
            .status(request.query);
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
