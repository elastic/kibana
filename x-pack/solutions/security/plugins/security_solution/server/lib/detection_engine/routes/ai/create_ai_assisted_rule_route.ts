/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_AI_ASSISTED_CREATE_RULE_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

import { getRuleCreationAgent } from '../../ai_assisted_rule_creation/agent';
import { getIterativeRuleCreationAgent } from '../../ai_assisted_rule_creation/iterative_agent';
import type { AIAssistedCreateRuleResponse } from '../../../../../common/api/detection_engine/ai_assisted/index.gen';
import { AIAssistedCreateRuleRequestBody } from '../../../../../common/api/detection_engine/ai_assisted/index.gen';
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

        const ctx = await context.resolve(['securitySolution', 'alerting']);
        const inferenceService = ctx.securitySolution.getInferenceService();

        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const savedObjectsClient = core.savedObjects.client;
        const rulesClient = await ctx.alerting.getRulesClient();

        const abortController = new AbortController();

        request.events.completed$.subscribe(() => abortController.abort());

        try {
          const createLlmInstance = async () => {
            if (!inferenceService || !connectorId) {
              throw new Error('Inference service or connector ID is not available');
            }
            return inferenceService.getChatModel({
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
          };

          // const model = await inferenceService.getChatModel({
          //   request,
          //   connectorId,
          //   chatModelOptions: {
          //     // not passing specific `model`, we'll always use the connector default model
          //     // temperature may need to be parametrized in the future
          //     temperature: 0.05,
          //     // Only retry once inside the model call, we already handle backoff retries in the task runner for the entire task
          //     maxRetries: 1,
          //     // Disable streaming explicitly
          //     disableStreaming: true,
          //     // Set a hard limit of 50 concurrent requests
          //     maxConcurrency: 50,
          //     signal: abortController.signal,
          //   },
          // });
          if (userQuery.startsWith('AAA')) {
            const model = await createLlmInstance();

            const ruleCreationAgent = getRuleCreationAgent({ model, logger });
            const result = await ruleCreationAgent.invoke({ userQuery: userQuery.slice(3) });

            if (result.error) {
              throw new Error(result.error);
            }

            return response.ok({
              body: {
                rule: result.rule,
              },
            });
          }

          const model = await createLlmInstance();
          const iterativeAgent = await getIterativeRuleCreationAgent({
            model,
            logger,
            inference: inferenceService,
            createLlmInstance,
            connectorId,
            request,
            esClient,
            savedObjectsClient,
            rulesClient,
          });

          const result = await iterativeAgent.invoke({ userQuery });

          //  console.log('toolAgentResult result', JSON.stringify(result, null, 2));

          if (result.error) {
            throw new Error(result.error);
          }

          return response.ok({
            body: {
              rule: result.rule,
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
