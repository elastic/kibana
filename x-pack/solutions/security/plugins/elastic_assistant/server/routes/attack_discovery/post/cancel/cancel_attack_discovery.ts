/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  AttackDiscoveryCancelResponse,
  API_VERSIONS,
  AttackDiscoveryCancelRequestParams,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import { updateAttackDiscoveryStatusToCanceled } from '../../helpers/helpers';
import { ATTACK_DISCOVERY_CANCEL_BY_CONNECTOR_ID } from '../../../../../common/constants';
import { buildResponse } from '../../../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../../../types';

export const cancelAttackDiscoveryRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_CANCEL_BY_CONNECTOR_ID,
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
            params: buildRouteValidationWithZod(AttackDiscoveryCancelRequestParams),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(AttackDiscoveryCancelResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<AttackDiscoveryCancelResponse>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        try {
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();

          const authenticatedUser = assistantContext.getCurrentUser();
          const connectorId = decodeURIComponent(request.params.connectorId);
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }
          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }
          const attackDiscovery = await updateAttackDiscoveryStatusToCanceled(
            dataClient,
            authenticatedUser,
            connectorId
          );

          return response.ok({
            body: attackDiscovery,
          });
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
