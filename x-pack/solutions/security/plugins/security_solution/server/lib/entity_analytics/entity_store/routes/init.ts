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

import {
  getAllMissingPrivileges,
  getMissingPrivilegesErrorMessage,
} from '../../../../../common/entity_analytics/privileges';
import { EntityType } from '../../../../../common/search_strategy';
import type { InitEntityEngineResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import {
  InitEntityEngineRequestBody,
  InitEntityEngineRequestParams,
} from '../../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { checkAndInitAssetCriticalityResources } from '../../asset_criticality/check_and_init_asset_criticality_resources';
import { buildInitRequestBodyValidation } from './validation';
import { buildIndexPatterns } from '../utils';

export const initEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: EntityAnalyticsRoutesDeps['config']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}/init',
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
            params: buildRouteValidationWithZod(InitEntityEngineRequestParams),
            body: buildInitRequestBodyValidation(InitEntityEngineRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<InitEntityEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const secSol = await context.securitySolution;
        const { pipelineDebugMode } = config.entityAnalytics.entityStore.developer;
        const { getSpaceId, getAppClient, getDataViewsService } = await context.securitySolution;
        const entityStoreClient = secSol.getEntityStoreDataClient();

        try {
          const securitySolutionIndices = await buildIndexPatterns(
            getSpaceId(),
            getAppClient(),
            getDataViewsService()
          );

          const privileges = await entityStoreClient.getEntityStoreInitPrivileges(
            securitySolutionIndices
          );

          if (!privileges.has_all_required) {
            const missingPrivilegesMsg = getMissingPrivilegesErrorMessage(
              getAllMissingPrivileges(privileges)
            );

            return siemResponse.error({
              statusCode: 403,
              body: `User does not have the required privileges to initialize the entity engine\n${missingPrivilegesMsg}`,
            });
          }

          await checkAndInitAssetCriticalityResources(context, logger);

          const body: InitEntityEngineResponse = await entityStoreClient.init(
            EntityType[request.params.entityType],
            request.body,
            {
              pipelineDebugMode,
            }
          );

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initialising entity engine: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
