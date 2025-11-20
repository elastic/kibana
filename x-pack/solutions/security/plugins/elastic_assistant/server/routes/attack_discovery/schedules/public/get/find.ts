/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import {
  API_VERSIONS,
  ATTACK_DISCOVERY_SCHEDULES_FIND,
  FindAttackDiscoverySchedulesRequestQuery,
  FindAttackDiscoverySchedulesResponse,
  transformAttackDiscoveryScheduleToApi,
} from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../../types';
import { performChecks } from '../../../../helpers';
import { throwIfPublicApiDisabled } from '../../../helpers/throw_if_public_api_disabled';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;

export const findAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'public',
      path: ATTACK_DISCOVERY_SCHEDULES_FIND,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
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
          await throwIfPublicApiDisabled(context);

          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const results = await dataClient.findSchedules({
            page: request.query.page,
            perPage: request.query.per_page,
            sort: {
              sortField: request.query.sort_field,
              sortDirection: request.query.sort_direction,
            },
          });

          // Transform internal format results to API format
          const apiResults = {
            page: request.query.page ?? DEFAULT_PAGE,
            per_page: request.query.per_page ?? DEFAULT_PER_PAGE,
            total: results.total,
            data: results.data.map((schedule) => transformAttackDiscoveryScheduleToApi(schedule)),
          };

          return response.ok({ body: apiResults });
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
