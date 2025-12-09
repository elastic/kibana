/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';
import { getAlertAiInsight, type AlertDocForInsight } from './get_alert_ai_insights';

export function getObservabilityAgentBuilderAiInsightsRouteRepository() {
  const getAlertAiInsightRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/ai_insights/alert',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readOnechat],
      },
    },
    params: t.type({
      body: t.type({
        alertId: t.string,
        connectorId: t.union([t.string, t.undefined]),
      }),
    }),
    handler: async ({
      core,
      dataRegistry,
      logger,
      request,
      params,
    }): Promise<{ summary: string; context: string }> => {
      const { alertId, connectorId: bodyConnectorId } = params.body;

      const [, startDeps] = await core.getStartServices();
      const { inference, ruleRegistry } = startDeps;

      const connectorId =
        bodyConnectorId ?? (await inference.getDefaultConnector(request))?.connectorId;

      if (!connectorId) {
        throw new Error('No default connector found');
      }

      const inferenceClient = inference.getClient({ request });

      const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
      const alertDoc = (await alertsClient.get({ id: alertId })) as AlertDocForInsight;

      const { summary, context } = await getAlertAiInsight({
        alertDoc,
        inferenceClient,
        connectorId,
        dataRegistry,
        request,
        logger,
      });

      return {
        summary,
        context,
      };
    },
  });

  return {
    ...getAlertAiInsightRoute,
  };
}
