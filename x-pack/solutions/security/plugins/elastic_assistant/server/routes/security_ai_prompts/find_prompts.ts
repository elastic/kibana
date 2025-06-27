/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
  FindSecurityAIPromptsRequestQuery,
  FindSecurityAIPromptsResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { getPromptsByGroupId } from '../../lib/prompt';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { performChecks } from '../helpers';

export const findSecurityAIPromptsRoute = (router: ElasticAssistantPluginRouter, logger: Logger) =>
  router.versioned
    .get({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindSecurityAIPromptsRequestQuery),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(FindSecurityAIPromptsResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<FindSecurityAIPromptsResponse>> => {
        const assistantResponse = buildResponse(response);

        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          // Perform license and authenticated user checks
          const checkResponse = await performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }
          const actions = ctx.elasticAssistant.actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const savedObjectsClient = ctx.elasticAssistant.savedObjectsClient;

          const prompts = await getPromptsByGroupId({
            actionsClient,
            connectorId: query.connector_id,
            promptGroupId: query.prompt_group_id,
            promptIds: query.prompt_ids,
            savedObjectsClient,
          });

          return response.ok({
            body: {
              prompts,
            },
          });
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
