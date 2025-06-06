/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import {
  API_VERSIONS,
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  UpdateAttackDiscoverySchedulesRequestBody,
  UpdateAttackDiscoverySchedulesRequestParams,
  UpdateAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../types';
import { performChecks } from '../../helpers';
import { isFeatureAvailable } from './utils/is_feature_available';

export const updateAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .put({
      access: 'internal',
      path: ATTACK_DISCOVERY_SCHEDULES_BY_ID,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateAttackDiscoverySchedulesRequestParams),
            body: buildRouteValidationWithZod(UpdateAttackDiscoverySchedulesRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(UpdateAttackDiscoverySchedulesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<UpdateAttackDiscoverySchedulesResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        // Check if scheduling feature available
        if (!(await isFeatureAvailable(ctx))) {
          return response.notFound();
        }

        // Perform license and authenticated user
        const checkResponse = await performChecks({
          context: ctx,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        const { id } = request.params;

        try {
          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const schedule = await dataClient.updateSchedule({
            id,
            ...request.body,
          });

          return response.ok({ body: schedule });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
