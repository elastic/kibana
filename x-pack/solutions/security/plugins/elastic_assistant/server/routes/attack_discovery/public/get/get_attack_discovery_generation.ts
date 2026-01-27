/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import type { GetAttackDiscoveryGenerationResponse } from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_GENERATIONS_BY_ID,
  GetAttackDiscoveryGenerationRequestParams,
  GetAttackDiscoveryGenerationRequestQuery,
} from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { performChecks } from '../../../helpers';
import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { getGeneration } from './helpers/get_generation';

export const PER_PAGE = 1000; // max 1000 discoveries for a single generation

export const getAttackDiscoveryGenerationRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
): void => {
  router.versioned
    .get({
      access: 'public',
      path: ATTACK_DISCOVERY_GENERATIONS_BY_ID,
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
            query: buildRouteValidationWithZod(GetAttackDiscoveryGenerationRequestQuery),
            params: buildRouteValidationWithZod(GetAttackDiscoveryGenerationRequestParams),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetAttackDiscoveryGenerationResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        // Perform license and authenticated user checks:
        const checkResponse = await performChecks({
          context: ctx,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const { execution_uuid: executionUuid } = request.params;
          const enableFieldRendering = request.query?.enable_field_rendering ?? false; // public APIs default to NOT rendering fields as a convenience to non-Kibana clients
          const withReplacements = request.query?.with_replacements ?? true; // public APIs default to applying replacements in responses as a convenience to non-Kibana clients
          const eventLogIndex = (await context.elasticAssistant).eventLogIndex;
          const spaceId = (await context.elasticAssistant).getSpaceId();
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();

          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const currentUser = await checkResponse.currentUser;

          const findResponse = await dataClient.findAttackDiscoveryAlerts({
            authenticatedUser: currentUser,
            esClient: ctx.core.elasticsearch.client.asCurrentUser,
            findAttackDiscoveryAlertsParams: {
              enableFieldRendering,
              executionUuid,
              page: 1,
              perPage: PER_PAGE,
              sortField: '@timestamp',
              withReplacements,
            },
            logger,
          });

          const data = findResponse.data;

          const generation = await getGeneration({
            dataClient,
            authenticatedUser: currentUser,
            eventLogIndex,
            executionUuid,
            logger,
            spaceId,
            data,
          });

          const responseBody: GetAttackDiscoveryGenerationResponse = {
            generation,
            data,
          };

          return response.ok({
            body: responseBody,
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
