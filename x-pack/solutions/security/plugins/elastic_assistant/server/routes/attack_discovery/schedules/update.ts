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
  UpdateAttackDiscoverySchedulesRequestBody,
  UpdateAttackDiscoverySchedulesRequestParams,
  UpdateAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../lib/build_response';
import { ATTACK_DISCOVERY_SCHEDULES_BY_ID } from '../../../../common/constants';
import { ElasticAssistantRequestHandlerContext } from '../../../types';

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
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const { id } = request.params;

        try {
          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const scheduleRule = await dataClient.updateSchedule({
            id,
            name: `[AD] Update Schedule Rule - ${new Date().getTime()}`,
            tags: ['attack_discovery'],
            params: { author: 'elastic' },
            schedule: { interval: '5s' },
            actions: [],
            ...request.body,
          });

          return response.ok({ body: { rule: scheduleRule } });
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
