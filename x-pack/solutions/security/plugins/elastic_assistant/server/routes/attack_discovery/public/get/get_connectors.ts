/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_CONNECTORS,
  GetAttackDiscoveryConnectorsRequestQuery,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { performChecks } from '../../../helpers';
import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';

export const getConnectorsRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'public',
      path: ATTACK_DISCOVERY_CONNECTORS,
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
            query: buildRouteValidationWithZod(GetAttackDiscoveryConnectorsRequestQuery),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<{ connectorsNames: string[] }>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const errorResponse = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const spaceId = assistantContext.getSpaceId();
        const dataClient = await assistantContext.getAttackDiscoveryDataClient();

        // Perform license and authenticated user checks:
        const checkResponse = await performChecks({
          context: ctx,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        if (!dataClient) {
          return errorResponse.error({
            body: `Attack discovery data client not initialized`,
            statusCode: 500,
          });
        }

        try {
          const connectorsNames = await dataClient.getConnectors({
            spaceId,
            from: request.query.from,
          });

          return response.ok({
            body: {
              connectorsNames,
            },
          });
        } catch (err) {
          assistantContext.logger.error(err);
          return errorResponse.error({
            body: `Failed to retrieve the connectors list. Check Kibana server logs for details.`,
            statusCode: 500,
          });
        }
      }
    );
};
