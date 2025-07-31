/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  API_VERSIONS,
  DeleteAllConversationsRequestBody,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { performChecks } from '../helpers';

export const deleteAllConversationsRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .delete({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
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
            body: buildRouteValidationWithZod(DeleteAllConversationsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const checkResponse = await performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }
          const dataClient = await ctx.elasticAssistant.getAIAssistantConversationsDataClient();

          const result = await dataClient?.deleteAllConversations({
            excludedIds: request.body?.excludedIds,
          });

          const hasFailures = result?.failures && result.failures.length > 0;

          return response.ok({
            body: {
              success: !hasFailures,
              totalDeleted: result?.total,
              failures: hasFailures
                ? result.failures?.map((failure) => failure.cause.reason)
                : null,
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
};
