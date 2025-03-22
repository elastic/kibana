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
  DeleteAttackDiscoverySchedulesRequestParams,
  DeleteAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import { buildResponse } from '../../../lib/build_response';
import { ATTACK_DISCOVERY_SCHEDULES_BY_ID } from '../../../../common/constants';
import { ElasticAssistantRequestHandlerContext } from '../../../types';

export const deleteAttackDiscoverySchedulesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .delete({
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
            params: buildRouteValidationWithZod(DeleteAttackDiscoverySchedulesRequestParams),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(DeleteAttackDiscoverySchedulesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<DeleteAttackDiscoverySchedulesResponse>> => {
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

          await dataClient.deleteSchedule({ id });

          return response.ok({ body: { id } });
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
