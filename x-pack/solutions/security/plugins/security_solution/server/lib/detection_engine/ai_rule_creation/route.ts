/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { StartServicesAccessor, Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { StartPlugins } from '../../../plugin';
import type { ConfigType } from '../../../config';
import { getBuildAgent } from './agent';

const AiRuleCreationRequestBody = z.object({
  userQuery: z
    .string()
    .min(1)
    .describe('Natural language description of the detection rule to create'),
  connectorId: z
    .string()
    .min(1)
    .describe('ID of the GenAI connector to use for rule generation'),
});

/**
 * POST /internal/security_solution/detection_engine/ai_rule_creation
 *
 * Accepts a natural-language prompt and a connector ID, runs the AI rule-creation
 * agent, and returns the generated detection rule.  Gated by the
 * `aiRuleCreationEnabled` experimental feature flag.
 */
export const registerAiRuleCreationRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .post({
      path: '/internal/security_solution/detection_engine/ai_rule_creation',
      access: 'internal',
      security: {
        authz: { enabled: false, reason: 'checked inside handler via aiRuleCreationEnabled flag' },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(AiRuleCreationRequestBody),
          },
        },
      },
      async (context, request, response) => {
        if (!config.experimentalFeatures.aiRuleCreationEnabled) {
          return response.notFound({
            body: {
              message:
                'AI rule creation is not enabled. Enable it via the "aiRuleCreationEnabled" experimental feature flag.',
            },
          });
        }

        try {
          const [coreStart, startPlugins] = await getStartServices();

          const { userQuery, connectorId } = request.body;

          const model = await startPlugins.inference.getChatModel({
            request,
            connectorId,
            chatModelOptions: {
              temperature: 0.05,
            },
          });

          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
          const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

          const agent = await getBuildAgent({
            model,
            logger,
            inference: startPlugins.inference,
            connectorId,
            request,
            esClient,
            savedObjectsClient,
            rulesClient,
          });

          const result = await agent.invoke({ userQuery });

          if (result.errors.length > 0) {
            return response.customError({
              statusCode: 500,
              body: {
                message: `Rule generation failed: ${result.errors.join('; ')}`,
                errors: result.errors,
              },
            });
          }

          return response.ok({
            body: {
              rule: result.rule,
              warnings: result.warnings,
            },
          });
        } catch (err) {
          return response.customError({
            statusCode: 500,
            body: { message: (err as Error).message ?? String(err) },
          });
        }
      }
    );
};
