/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_USERS_SUGGEST_URL,
  SuggestUsersRequestBody,
  SuggestUsersResponse,
} from '@kbn/elastic-assistant-common';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { performChecks } from '../helpers';

export const suggestUsersRoute = (router: ElasticAssistantPluginRouter, logger: Logger) =>
  router.versioned
    .post({
      access: 'internal',
      path: ELASTIC_USERS_SUGGEST_URL,
      security: {
        authz: {
          // TODO is suggestUserProfiles a thing? got it from the docs
          requiredPrivileges: ['elasticAssistant', 'suggestUserProfiles'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(SuggestUsersRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(SuggestUsersResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<SuggestUsersResponse>> => {
        const assistantResponse = buildResponse(response);

        try {
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

          const { searchTerm, size } = request.body;
          const result = await ctx.elasticAssistant.userProfiles.suggest({
            name: searchTerm,
            size,
            dataPath: 'avatar',
            // TODO research requiredPrivileges
            // requiredPrivileges: {
            //   spaceId,
            //   privileges: {
            //     kibana: UserProfileService.buildRequiredPrivileges(owners, securityPluginStart),
            //   },
            // },
          });
          console.log('users search result: ==>', JSON.stringify(result, null, 2));
          return response.ok({
            body: result,
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
