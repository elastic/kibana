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
  ATTACK_DISCOVERY_SCHEDULES_FIND,
  FindAttackDiscoverySchedulesRequestQuery,
  FindAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../types';
import { performChecks } from '../../helpers';
import { isFeatureAvailable } from './utils/is_feature_available';

export const findAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'internal',
      path: ATTACK_DISCOVERY_SCHEDULES_FIND,
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
            query: buildRouteValidationWithZod(FindAttackDiscoverySchedulesRequestQuery),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(FindAttackDiscoverySchedulesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<FindAttackDiscoverySchedulesResponse>> => {
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

        try {
          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const { page, perPage, sortField, sortDirection } = request.query;

          const results = await dataClient.findSchedules({
            page,
            perPage,
            sort: { sortField, sortDirection },
          });

          return response.ok({ body: results });
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
