/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, StartServicesAccessor, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { acknowledgeSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_AI_ASSISTED_CREATE_RULE_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { StartPlugins } from '../../../../plugin';
import { SuggestUserProfilesRequestQuery } from '../../../../../common/api/detection_engine/users';
import type { AIAssistedCreateRuleResponse } from '../../../../../common/api/detection_engine/ai_assisted/index.gen';
import { AIAssistedCreateRuleRequestBody } from '../../../../../common/api/detection_engine/ai_assisted/index.gen';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { getRulesSchemaMock } from '../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
export const createAIAssistedRuleRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_AI_ASSISTED_CREATE_RULE_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(AIAssistedCreateRuleRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<AIAssistedCreateRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        console.log('Creating AI-assisted rule');
        const { user_query: userQuery, connector_id: connectorId } = request.body;

        const ctx = await context.resolve(['securitySolution']);
        const inferenceService = ctx.securitySolution.getInferenceService();

        const abortController = new AbortController();

        request.events.completed$.subscribe(() => abortController.abort());

        try {
          const model = await inferenceService.getChatModel({
            request,
            connectorId,
            chatModelOptions: {
              // not passing specific `model`, we'll always use the connector default model
              // temperature may need to be parametrized in the future
              temperature: 0.05,
              // Only retry once inside the model call, we already handle backoff retries in the task runner for the entire task
              maxRetries: 1,
              // Disable streaming explicitly
              disableStreaming: true,
              // Set a hard limit of 50 concurrent requests
              maxConcurrency: 50,
              signal: abortController.signal,
            },
          });

          const rest = await model.invoke(userQuery);

          return response.ok({
            body: {
              rule: { ...getRulesSchemaMock(), index: ['ai_index', rest.content], references: [] },
            },
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
        // const siemResponse = buildSiemResponse(response);
        // const [_, { security }] = await getStartServices();
        // const securitySolution = await context.securitySolution;
        // const spaceId = securitySolution.getSpaceId();

        // try {
        //   const users = await security.userProfiles.suggest({
        //     name: searchTerm,
        //     dataPath: 'avatar',
        //     requiredPrivileges: {
        //       spaceId,
        //       privileges: {
        //         kibana: [security.authz.actions.login],
        //       },
        //     },
        //   });

        //   return response.ok({ body: users });
        // } catch (err) {
        //   const error = transformError(err);
        //   return siemResponse.error({
        //     body: error.message,
        //     statusCode: error.statusCode,
        //   });
        // }
      }
    );
};
