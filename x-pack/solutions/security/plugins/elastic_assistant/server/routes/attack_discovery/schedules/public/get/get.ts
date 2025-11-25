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
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  GetAttackDiscoverySchedulesRequestParams,
  GetAttackDiscoverySchedulesResponse,
  transformAttackDiscoveryScheduleToApi,
} from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../../types';
import { performChecks } from '../../../../helpers';
import { throwIfPublicApiDisabled } from '../../../helpers/throw_if_public_api_disabled';

export const getAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'public',
      path: ATTACK_DISCOVERY_SCHEDULES_BY_ID,
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
            params: buildRouteValidationWithZod(GetAttackDiscoverySchedulesRequestParams),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(GetAttackDiscoverySchedulesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetAttackDiscoverySchedulesResponse>> => {
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

        const { id } = request.params;

        try {
          await throwIfPublicApiDisabled(context);

          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const schedule = await dataClient.getSchedule(id);

          return response.ok({ body: transformAttackDiscoveryScheduleToApi(schedule) });
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
