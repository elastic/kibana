/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { API_VERSIONS, FindAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../lib/build_response';
import { ATTACK_DISCOVERY_SCHEDULES_FIND } from '../../../../common/constants';
import { ElasticAssistantRequestHandlerContext } from '../../../types';
import { convertAlertingRuleToSchedule } from './utils/convert_alerting_rule_to_schedule';
import { performChecks } from '../../helpers';

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

        // Perform license, authenticated user and Attack Discovery Schedule FF checks
        const checkResponse = await performChecks({
          capability: 'assistantAttackDiscoverySchedulingEnabled',
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

          const results = await dataClient.findSchedules();
          const { page, perPage, total, data } = results;

          const schedules = data.map(convertAlertingRuleToSchedule);

          return response.ok({ body: { page, perPage, total, data: schedules } });
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
