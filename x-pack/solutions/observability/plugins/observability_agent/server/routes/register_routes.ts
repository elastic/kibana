/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { getAlertAiInsight } from './ai_insights/get_alert_ai_insight';
import type {
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import type { ObservabilityAgentDataRegistry } from '../data_registry/data_registry';

export function registerAiInsightRoutes(
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>,
  logger: Logger,
  dataRegistry: ObservabilityAgentDataRegistry
) {
  const router = core.http.createRouter();

  router.post(
    {
      path: '/internal/observability_agent_builder/ai_insights/alert',
      validate: {
        body: schema.object({
          alertId: schema.string(),
          connectorId: schema.maybe(schema.string()),
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readOnechat],
        },
      },
    },
    async (context, request, response) => {
      try {
        const { connectorId, alertId } = request.body;
        const [, pluginsStart] = await core.getStartServices();
        const { inference, ruleRegistry } = pluginsStart;

        const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
        const alertDoc = await alertsClient.get({ id: alertId });

        const inferenceClient = inference.getClient({ request });
        const { summary, context: relatedContext } = await getAlertAiInsight({
          alertDoc,
          inferenceClient,
          connectorId,
          dataRegistry,
          request,
          logger,
        });

        return response.ok({
          body: {
            summary,
            context: relatedContext,
          },
        });
      } catch (e) {
        logger.error(
          `AI insight alert endpoint failed: ${e instanceof Error ? e.message : String(e)}`
        );
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to generate AI insight summary' },
        });
      }
    }
  );
}
