/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_API_ACTION_ALL,
  ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE,
} from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_SCHEDULES,
  CreateAttackDiscoverySchedulesRequestBody,
  CreateAttackDiscoverySchedulesResponse,
  transformAttackDiscoveryScheduleCreatePropsFromApi,
  transformAttackDiscoveryScheduleToApi,
} from '@kbn/elastic-assistant-common';

import { buildResponse } from '../../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../../types';
import { performChecks } from '../../../../helpers';

export const createAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .post({
      access: 'public',
      path: ATTACK_DISCOVERY_SCHEDULES,
      security: {
        authz: {
          requiredPrivileges: [
            ATTACK_DISCOVERY_API_ACTION_ALL,
            ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE,
          ],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateAttackDiscoverySchedulesRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(CreateAttackDiscoverySchedulesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<CreateAttackDiscoverySchedulesResponse>> => {
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
          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          // Transform API format create properties to internal format
          const internalScheduleData = transformAttackDiscoveryScheduleCreatePropsFromApi({
            ...request.body,
            enabled: request.body.enabled ?? false, // Default to disabled for security
          });

          const schedule = await dataClient.createSchedule(internalScheduleData);

          // Transform internal format back to API format for response
          const apiSchedule = transformAttackDiscoveryScheduleToApi(schedule);

          return response.ok({ body: apiSchedule });
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
