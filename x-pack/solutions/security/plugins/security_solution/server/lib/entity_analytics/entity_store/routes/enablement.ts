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

import type { InitEntityStoreResponse } from '../../../../../common/api/entity_analytics/entity_store/enable.gen';
import { InitEntityStoreRequestBody } from '../../../../../common/api/entity_analytics/entity_store/enable.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { checkAndInitAssetCriticalityResources } from '../../asset_criticality/check_and_init_asset_criticality_resources';

export const enableEntityStoreRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
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
            body: buildRouteValidationWithZod(InitEntityStoreRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<InitEntityStoreResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;
        const { pipelineDebugMode } = config.entityAnalytics.entityStore.developer;

        await checkAndInitAssetCriticalityResources(context, logger);

        try {
          const body: InitEntityStoreResponse = await secSol
            .getEntityStoreDataClient()
            .enable(request.body, { pipelineDebugMode });

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initialising entity store: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
