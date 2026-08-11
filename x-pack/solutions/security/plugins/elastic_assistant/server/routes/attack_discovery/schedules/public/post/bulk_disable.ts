/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';
import {
  ATTACK_DISCOVERY_API_ACTION_ALL,
  ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE,
} from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import {
  API_VERSIONS,
  ATTACK_DISCOVERY_SCHEDULES_BULK_DISABLE,
  BulkActionAttackDiscoverySchedulesRequestBody,
  BulkActionAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../../types';
import { performChecks } from '../../../../helpers';

export const bulkDisableAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .post({
      access: 'public',
      path: ATTACK_DISCOVERY_SCHEDULES_BULK_DISABLE,
      security: {
        authz: {
          requiredPrivileges: [
            ATTACK_DISCOVERY_API_ACTION_ALL,
            ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE,
            ALERTS_API_READ,
          ],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(BulkActionAttackDiscoverySchedulesRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(BulkActionAttackDiscoverySchedulesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<BulkActionAttackDiscoverySchedulesResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: ctx,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        const { ids } = request.body;

        try {
          const dataClient = await assistantContext.getAttackDiscoverySchedulingDataClient();
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const result = await dataClient.bulkDisableSchedules({ ids });

          return response.ok({ body: result });
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
